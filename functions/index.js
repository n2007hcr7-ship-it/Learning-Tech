const admin  = require("firebase-admin");
const { onSchedule }          = require("firebase-functions/v2/scheduler");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue }      = require("firebase-admin/firestore");
const { getMessaging }                  = require("firebase-admin/messaging");
const crypto = require("crypto");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

// ================================================================
// DUAL-PROJECT ARCHITECTURE (PROFESSIONAL GOOGLE-STYLE)
// ================================================================

// 1. Initialize Primary App (Account 1: 14f73) - Default context for Functions, RTDB, and Auth
admin.initializeApp();
const rtdb = admin.database();

/**
 * 2. Initialize Secondary App (Account 2: 530c7) - Dedicated for Firestore
 * 
 * IMPORTANT: To make this work, you MUST:
 * a. Go to Firebase Console (learning-tech-530c7) > Project Settings > Service Accounts.
 * b. Click "Generate New Private Key" and save it as 'functions/service-account.json'.
 * c. DO NOT commit 'service-account.json' to Git (it is sensitive).
 */
let db;
try {
    const serviceAccount = require("./service-account.json");
    const secondaryApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    }, 'secondary');
    db = getFirestore(secondaryApp);
    console.log("✅ Successfully bridged to Secondary Firestore (530c7)");
} catch (e) {
    console.warn("⚠️ 'service-account.json' not found. Functions currently fallback to Primary Firestore (14f73).");
    db = getFirestore();
}

// ================================================================
// Chargily Pay v2 — Configuration
// ================================================================
// مفتاح Chargily موجود في بيئة Cloud Functions فقط (لا يُعرَّض للعميل أبداً).
// لتعيينه:  firebase functions:secrets:set CHARGILY_SECRET_KEY
// ================================================================
const CHARGILY_API = "https://pay.chargily.net/api/v2";
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

function getChargilyKey() {
  const key = process.env.CHARGILY_SECRET_KEY;
  if (!key) throw new HttpsError("failed-precondition", "Chargily secret key is not configured.");
  return key;
}

// ================================================================
// 1. createChargilyCheckout — Callable HTTPS Function
// ================================================================
/**
 * يُستدعى من الواجهة الأمامية عند نقر "تأكيد وشحن الرصيد".
 * يُنشئ جلسة دفع على خوادم Chargily ويُعيد رابط الدفع للعميل.
 *
 * المُدخلات:  { amount: number, method: "edahabia"|"baridimob", successUrl: string }
 * المُخرجات: { checkoutUrl: string, checkoutId: string }
 */
exports.createChargilyCheckout = onCall(
  { secrets: ["CHARGILY_SECRET_KEY"] },
  async (request) => {
    // ── 1. التحقق من المصادقة ──────────────────────────────
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً.");
    }

    const uid = request.auth.uid;
    const { amount, method, successUrl } = request.data;

    // ── 2. التحقق من المدخلات ─────────────────────────────
    if (!amount || typeof amount !== "number" || amount < 200) {
      throw new HttpsError("invalid-argument", "الحد الأدنى للشحن هو 200 دج.");
    }
    const VALID_METHODS = ["edahabia", "baridimob"];
    if (!method || !VALID_METHODS.includes(method)) {
      throw new HttpsError("invalid-argument", "طريقة الدفع غير مدعومة.");
    }

    const appOrigin = successUrl || "https://learning-tech-14f73.web.app";
    // عنوان Webhook الفعلي بعد النشر على Firebase
    const webhookUrl = "https://us-central1-learning-tech-14f73.cloudfunctions.net/chargilyWebhook";

    // ── 3. إنشاء سجل دفع بحالة "pending" في Firestore ────
    const paymentRef = await db.collection("payments").add({
      userId:    uid,
      amount,
      method,
      type:      "topup",
      status:    "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    // ── 4. استدعاء Chargily Pay API v2 ────────────────────
    const body = {
      amount,
      currency:       "dzd",
      payment_method: method,
      success_url:    `${appOrigin}/payment-success`,
      failure_url:    `${appOrigin}/payment-failed`,
      webhook_endpoint: webhookUrl,
      metadata: {
        userId:    uid,
        paymentId: paymentRef.id,
        type:      "topup",
      },
      description: `شحن رصيد Learning Tech — ${amount} دج`,
    };

    const response = await fetch(`${CHARGILY_API}/checkouts`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${getChargilyKey()}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      // تحديث حالة الدفع لـ failed
      await paymentRef.update({ status: "failed", errorMessage: data.message });
      console.error("Chargily API error:", data);
      throw new HttpsError(
        "internal",
        data.message || "خطأ في بوابة الدفع Chargily."
      );
    }

    // ── 5. حفظ معرّف الجلسة في سجل الدفع ─────────────────
    await paymentRef.update({
      chargilyCheckoutId: data.id,
      chargilyCheckoutUrl: data.checkout_url,
    });

    console.log(`✅ تم إنشاء جلسة دفع Chargily للمستخدم ${uid} — مبلغ: ${amount} دج`);

    return {
      checkoutUrl: data.checkout_url,
      checkoutId:  data.id,
    };
  }
);

// ================================================================
// 2. chargilyWebhook — HTTP Function (استقبال تأكيد الدفع)
// ================================================================
/**
 * تُستدعى تلقائياً من خوادم Chargily عند اكتمال عملية الدفع.
 * تُحقق من توقيع HMAC-SHA256 لضمان أن المصدر هو Chargily فعلاً.
 * ثم تُحدّث رصيد المستخدم في Firestore بشكل ذري.
 *
 * شرط الأمان: لا يمكن لأي طرف ثالث تزوير هذا الطلب بدون المفتاح السري.
 */
exports.chargilyWebhook = onRequest(
  { secrets: ["CHARGILY_SECRET_KEY"] },
  async (req, res) => {
    // ── 1. قبول POST فقط ──────────────────────────────────
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // ── 2. التحقق من التوقيع (HMAC-SHA256) ───────────────
    const signature = req.headers["signature"];
    const rawBody   = req.rawBody; // استخدام البيانات الخام لضمان التطابق مع التوقيع

    if (!rawBody) {
      console.error("❌ Chargily webhook: لا توجد بيانات خام (rawBody)!");
      res.status(400).send("Missing body");
      return;
    }

    const expectedSig = crypto
      .createHmac("sha256", getChargilyKey())
      .update(rawBody)
      .digest("hex");

    if (!signature || signature !== expectedSig) {
      console.error("❌ Chargily webhook: توقيع غير صالح!");
      res.status(401).send("Invalid signature");
      return;
    }


    // ── 3. معالجة الحدث ───────────────────────────────────
    const event = req.body;
    console.log(`📩 Chargily webhook received: ${event.type}`);

    if (event.type === "checkout.paid") {
      const checkout = event.data;
      const { userId, paymentId } = checkout.metadata || {};

      if (!userId) {
        console.error("❌ Webhook: لا يوجد userId في metadata.");
        res.status(200).send("OK"); // نُعيد 200 لمنع إعادة المحاولة
        return;
      }

      try {
        // ── 4. تحديث رصيد المستخدم ذرياً (Atomic) ────────
        const amountPaid = checkout.amount; // بالدينار الجزائري

        await db.runTransaction(async (tx) => {
          const userRef = db.collection("users").doc(userId);
          tx.update(userRef, {
            balance:         FieldValue.increment(amountPaid),
            lastPaymentAt:   FieldValue.serverTimestamp(),
          });

          // ── 5. تحديث سجل الدفع ───────────────────────────
          if (paymentId) {
            const payRef = db.collection("payments").doc(paymentId);
            tx.update(payRef, {
              status:             "success",
              chargilyCheckoutId: checkout.id,
              paidAt:             FieldValue.serverTimestamp(),
            });
          }

          // ── 6. تسجيل المعاملة في سجل التدقيق ─────────────
          const txRef = db.collection("balanceTransactions").doc();
          tx.set(txRef, {
            userId,
            type:      "topup",
            amount:    amountPaid,
            currency:  "dzd",
            source:    "chargily",
            checkoutId: checkout.id,
            createdAt: FieldValue.serverTimestamp(),
          });
        });

        console.log(`✅ تم شحن رصيد ${amountPaid} دج للمستخدم ${userId}`);
      } catch (err) {
        console.error("❌ فشل تحديث الرصيد:", err);
        res.status(500).send("Internal Error");
        return;
      }
    }

    res.status(200).send("OK");
  }
);

// ================================================================
// 3. getAgoraToken — Callable HTTPS Function
// ================================================================
/**
 * يُستدعى من الواجهة للحصول على توكن Agora للانضمام للبث المباشر.
 * يتحقق من صلاحية المستخدم (أستاذ البث أو طالب دفع النقاط).
 *
 * المُدخلات: { channelName: string, uid: number }
 * المُخرجات: { token: string }
 */
exports.getAgoraToken = onCall(
  { secrets: ["AGORA_APP_ID", "AGORA_APP_CERTIFICATE"] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً.");

    const { channelName, uid } = request.data;
    if (!channelName || !uid) {
      throw new HttpsError("invalid-argument", "نقص في معرّف القناة أو المستخدم.");
    }

    const appId = AGORA_APP_ID || process.env.AGORA_APP_ID;
    const appCertificate = AGORA_APP_CERTIFICATE || process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      throw new HttpsError("failed-precondition", "بيانات Agora غير مكتملة على الخادم.");
    }

    const userUid = request.auth.uid;
    const userRef = db.collection("users").doc(userUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new HttpsError("not-found", "المستخدم غير موجود.");
    const userData = userSnap.data();

    // ── التحقق من الصلاحية ─────────────────────────────────────
    // القناة في تطبيقنا هي معرّف الغرفة (LiveRoom ID)
    let role = RtcRole.SUBSCRIBER;

    if (userData.role === "teacher") {
      // إذا كان أستاذاً، نتحقق هل هو صاحب البث (اختياري، للتبسيط سنعطيه Publisher)
      role = RtcRole.PUBLISHER;
    } else {
      // إذا كان طالباً، نتحقق هل دفع النقاط أو لديه اشتراك
      const unlockedLiveStreams = userData.unlockedLiveStreams || [];
      const isSubscribed = userData.isSubscribed || false;

      if (!isSubscribed && !unlockedLiveStreams.includes(channelName)) {
        throw new HttpsError("permission-denied", "ليس لديك صلاحية لدخول هذا البث. ادفع النقاط أولاً.");
      }
    }

    // ── إنشاء التوكن ──────────────────────────────────────────
    const expirationTimeInSeconds = 3600; // ساعة واحدة
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    console.log(`📡 تـم إنشاء توكن Agora للمستخدم ${userUid} في القناة ${channelName}`);
    return { token };
  }
);

// ================================================================
// 4. payForAgoraStream — Callable HTTPS Function
// ================================================================
/**
 * يُستدعى من قبل الأستاذ لدفع تكلفة موارد Agora الخاصة بالبث.
 * يتم خصم المبلغ من رصيده المالي (Balance).
 *
 * المُدخلات: { roomId: string, duration: number, maxAttendees: number }
 */
exports.payForAgoraStream = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول.");

  const { roomId, duration, maxAttendees } = request.data;
  if (!roomId || !duration || !maxAttendees) {
    throw new HttpsError("invalid-argument", "بيانات البث غير مكتملة.");
  }

  const uid = request.auth.uid;
  const userRef = db.collection("users").doc(uid);

  // حساب التكلفة: (الساعة = 100 دج لكل 50 طالب)
  const cost = Math.ceil((duration / 60) * (maxAttendees / 50) * 100);

  return db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) throw new HttpsError("not-found", "المستخدم غير موجود.");
    
    const userData = userSnap.data();
    if (userData.role !== "teacher") throw new HttpsError("permission-denied", "فقط الأساتذة يمكنهم دفع تكاليف البث.");
    
    const currentBalance = userData.balance || 0;
    if (currentBalance < cost) {
      throw new HttpsError("resource-exhausted", `رصيدك غير كافٍ. تحتاج إلى ${cost} د.ج لبدء هذا البث.`);
    }

    // 1. خصم الرصيد
    transaction.update(userRef, {
      balance: currentBalance - cost
    });

    // 2. تسجيل العملية في السجل
    const logRef = db.collection("transactions").doc();
    transaction.set(logRef, {
      userId: uid,
      amount: -cost,
      type: "agora_stream_payment",
      roomId: roomId,
      timestamp: FieldValue.serverTimestamp()
    });

    // 3. تحديث حالة الدفع للبث (في Firestore ميتاداتا)
    const streamMetaRef = db.collection("liveStreams_meta").doc(roomId);
    transaction.set(streamMetaRef, {
      isPaid: true,
      paidAt: FieldValue.serverTimestamp(),
      paidBy: uid,
      cost: cost,
      duration: duration,
      maxAttendees: maxAttendees
    }, { merge: true });

    // 4. تحديث حالة البث في Realtime Database ليصبح "مباشر" فوراً وبأمان
    const rtdbRef = rtdb.ref(`liveStreams/${roomId}`);
    transaction.set(db.collection("_internal_triggers").doc(), {
      type: "rtdb_sync",
      path: `liveStreams/${roomId}/status`,
      value: "live",
      timestamp: FieldValue.serverTimestamp()
    });
    
    // ملاحظة: بما أن Realtime Database لا تدعم العمليات المشتركة (Cross-DB transactions) مباشرة مع Firestore،
    // سنقوم بتحديثها هنا مباشرة بعد نجاح عملية الحساب.
    return rtdbRef.update({ status: 'live' }).then(() => ({ success: true, cost }));
  });
});

// ================================================================
// 5. awardLessonPoint — Callable HTTPS Function
// ================================================================
exports.awardLessonPoint = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً.");
  }

  const uid = request.auth.uid;
  const { lessonId } = request.data;

  if (!lessonId || typeof lessonId !== "string") {
    throw new HttpsError("invalid-argument", "معرّف الدرس غير صالح.");
  }

  const userRef  = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) throw new HttpsError("not-found", "المستخدم غير موجود.");

  const userData = userSnap.data();

  if (userData.role !== "student") {
    throw new HttpsError("permission-denied", "فقط التلاميذ يمكنهم كسب النقاط.");
  }

  const completedLessons = userData.completedLessons || [];
  if (completedLessons.includes(lessonId)) {
    return { success: false, reason: "already_completed", points: userData.points };
  }

  const lessonSnap = await db.collection("lessons").doc(lessonId).get();
  if (!lessonSnap.exists) throw new HttpsError("not-found", "الدرس غير موجود.");

  const studentRef = db.collection("students").doc(uid);
  const batch      = db.batch();

  batch.update(userRef, {
    points:           FieldValue.increment(1),
    completedLessons: FieldValue.arrayUnion(lessonId),
    lastActivityAt:   FieldValue.serverTimestamp(),
  });
  batch.update(studentRef, {
    points:           FieldValue.increment(1),
    completedLessons: FieldValue.arrayUnion(lessonId),
  });

  const txRef = db.collection("pointsTransactions").doc();
  batch.set(txRef, {
    userId:    uid,
    type:      "earn",
    amount:    1,
    reason:    "lesson_completed",
    lessonId,
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  const newPoints = (userData.points || 0) + 1;
  console.log(`✅ منحت نقطة للمستخدم ${uid} على الدرس ${lessonId}. رصيده: ${newPoints}`);

  return { success: true, points: newPoints };
});

// ================================================================
// 4. processServicePayment (DZD) — Callable HTTPS Function
// ================================================================
/**
 * يُستدعى للتجارة الداخلية للمنصة (بالدينار الجزائري).
 * يخصم من رصيد التلميذ ويوزع الأرباح:
 * 2% (Chargily) | 70% من الصافي للأستاذ | 30% من الصافي للمنصة
 */
exports.processServicePayment = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً.");

  const uid = request.auth.uid;
  const { amount, reason, teacherId } = request.data;

  const VALID_REASONS = ["live_stream", "normal_chat", "premium_chat", "subscription"];
  if (!reason || !VALID_REASONS.includes(reason)) {
    throw new HttpsError("invalid-argument", "سبب الدفع غير معرّف.");
  }

  const userRef = db.collection("users").doc(uid);

  return await db.runTransaction(async (tx) => {
    let actualAmount = amount;
    let teacherRef = null;
    let teacherUserRef = null;

    if (teacherId) {
      teacherRef = db.collection("teachers").doc(teacherId);
      teacherUserRef = db.collection("users").doc(teacherId);
      const teacherSnap = await tx.get(teacherRef);
      if (teacherSnap.exists) {
        const pricing = teacherSnap.data().pricing || {};
        // تطبيق الأسعار الديناميكية مع الحدود الدنيا من السيرفر للأمان
        if (reason === "normal_chat") actualAmount = Math.max(Number(pricing.normalChat || 300), 300);
        if (reason === "premium_chat") actualAmount = Math.max(Number(pricing.premiumChat || 1000), 1000);
        if (reason === "subscription") actualAmount = Number(pricing.subscription || 0);
      }
    }

    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError("not-found", "المستخدم غير موجود.");

    const currentBalance = userSnap.data().balance || 0;
    if (currentBalance < actualAmount) {
      throw new HttpsError(
        "resource-exhausted",
        `رصيدك غير كافٍ. لديك ${currentBalance} دج، المطلوب ${actualAmount} دج.`
      );
    }

    const studentRef = db.collection("students").doc(uid);
    tx.update(userRef,    { balance: FieldValue.increment(-actualAmount), lastActivityAt: FieldValue.serverTimestamp() });
    tx.update(studentRef, { balance: FieldValue.increment(-actualAmount) });

    const txRef = db.collection("balanceTransactions").doc();
    tx.set(txRef, {
      userId: uid, type: "spend", amount: -actualAmount, reason,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (teacherId && teacherRef && teacherUserRef) {
      // الحساب الرياضي الدقيق (70/30 من نسبة الـ 98% المتبقية)
      const chargilyFee = actualAmount * 0.02;
      const netAmount = actualAmount - chargilyFee;
      
      const teacherEarning = parseFloat((netAmount * 0.70).toFixed(2));
      const platformCommission = parseFloat((netAmount * 0.30).toFixed(2));

      tx.set(teacherRef, { balance: FieldValue.increment(teacherEarning) }, { merge: true });
      tx.set(teacherUserRef, { balance: FieldValue.increment(teacherEarning) }, { merge: true });

      const earningRef = db.collection("earnings").doc();
      tx.set(earningRef, {
        teacherId: teacherId,
        studentId: uid,
        originalAmount: actualAmount,
        chargilyFee: chargilyFee,
        earnedAmount: teacherEarning, // حصة الأستاذ (70%)
        platformCommission: platformCommission, // حصتك (30%)
        reason: reason,
        createdAt: FieldValue.serverTimestamp()
      });
    }

    return { success: true, balance: currentBalance - actualAmount };
  });
});

// ================================================================
// 5. spendPoints (Bonus/Rewards System) — Callable HTTPS Function
// ================================================================
/**
 * يُستخدم فقط لاستبدال النقاط (المكافآت) التي كسبها التلميذ من الدروس.
 * لا يوزع أرباحاً مالية حقيقية بل يفتح الخدمة كـ "هدية" (Bonus).
 */
exports.spendPoints = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً.");

  const uid = request.auth.uid;
  const { amount, reason, teacherId } = request.data;

  if (!amount || typeof amount !== "number" || amount <= 0) {
    throw new HttpsError("invalid-argument", "عدد النقاط غير صالح.");
  }

  const userRef = db.collection("users").doc(uid);

  return await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError("not-found", "المستخدم غير موجود.");

    const currentPoints = userSnap.data().points || 0;
    if (currentPoints < amount) {
      throw new HttpsError("resource-exhausted", "رصيد نقاطك غير كافٍ.");
    }

    const studentRef = db.collection("students").doc(uid);
    tx.update(userRef,    { points: FieldValue.increment(-amount) });
    tx.update(studentRef, { points: FieldValue.increment(-amount) });

    const txRef = db.collection("pointsTransactions").doc();
    tx.set(txRef, {
      userId: uid, type: "spend_bonus", amount: -amount, reason,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, points: currentPoints - amount };
  });
});

// ================================================================
// 6. deleteUserAccount — Callable HTTPS Function
// ================================================================
/**
 * يحذف الحساب نهائياً من الـ Auth ومن Firestore.
 * لا يمكن استرداد الحساب أو الرصيد بعد هذا الإجراء.
 */
exports.deleteUserAccount = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول أولاً.");
  
  const uid = request.auth.uid;

  try {
    // 1. حذف البيانات من Firestore
    const userRef    = db.collection("users").doc(uid);
    const teacherRef = db.collection("teachers").doc(uid);
    const studentRef = db.collection("students").doc(uid);

    const batch = db.batch();
    batch.delete(userRef);
    batch.delete(teacherRef);
    batch.delete(studentRef);
    
    await batch.commit();

    // 2. حذف المستخدم من Firebase Auth
    await admin.auth().deleteUser(uid);

    return { success: true, message: "تم حذف الحساب بنجاح." };
  } catch (error) {
    console.error("Account deletion error:", error);
    throw new HttpsError("internal", "حدث خطأ أثناء محاولة حذف الحساب.");
  }
});

// ================================================================
// 5. premiumChatReminder — Scheduled (كل 10 دقائق)
// ================================================================
exports.premiumChatReminder = onSchedule("every 10 minutes", async () => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const snapshot = await db.collection("chats")
    .where("type", "==", "premium")
    .where("updatedAt", "<", admin.firestore.Timestamp.fromDate(tenMinutesAgo))
    .get();

  if (snapshot.empty) { console.log("لا يوجد تلاميذ مميزون ينتظرون."); return; }

  const batch = db.batch();
  let notificationsSent = 0;

  for (const doc of snapshot.docs) {
    const chat = doc.data();
    if (chat.lastSenderId === chat.studentId || !chat.lastSenderId) {
      const teacherSnap = await db.collection("teachers").doc(chat.teacherId).get();
      if (teacherSnap.exists) {
        const fcmToken = teacherSnap.data().fcmToken;
        if (fcmToken) {
          try {
            await getMessaging().send({
              notification: {
                title: "🚨 تلميذ VIP ينتظر!",
                body:  `رسالة من ${chat.studentName} منذ أكثر من 10 دقائق!`,
              },
              token: fcmToken,
            });
            notificationsSent++;
            batch.update(doc.ref, {
              lastReminderSentAt: FieldValue.serverTimestamp(),
              reminderCount:      FieldValue.increment(1),
            });
          } catch (e) {
            console.error("خطأ في إرسال الإشعار:", e);
          }
        }
      }
    }
  }

  if (notificationsSent > 0) await batch.commit();
  console.log(`تم إرسال ${notificationsSent} إشعارات للأساتذة.`);
});
