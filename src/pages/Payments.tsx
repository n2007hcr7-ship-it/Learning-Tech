import { useState } from 'react';
import {
  CreditCard, ShieldCheck, Zap, ArrowRight,
  CheckCircle2, AlertCircle, Coins, ExternalLink, Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

// ── نوع بيانات الاستجابة من CF ─────────────────────────────────
interface CheckoutResponse {
  checkoutUrl: string;
  checkoutId:  string;
}

// ── خيارات المبالغ السريعة ──────────────────────────────────────
const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

// ================================================================
// Payments Page — تكامل Chargily Pay v2 الحقيقي
// ================================================================
const PaymentsPage = () => {
  const { user, profile } = useAuth();
  const [amount, setAmount]   = useState('');
  const [method, setMethod]   = useState<'edahabia' | 'baridimob' | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !method || !user) return;

    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount < 200) {
      toast.error('الحد الأدنى للشحن هو 200 دج');
      return;
    }

    setLoading(true);
    toast.loading('جاري إنشاء جلسة الدفع الآمنة...', { id: 'chargily' });

    try {
      // ── 1. استدعاء Cloud Function لإنشاء جلسة دفع Chargily ──
      const createCheckout = httpsCallable<
        { amount: number; method: string; successUrl: string },
        CheckoutResponse
      >(functions, 'createChargilyCheckout');

      const result = await createCheckout({
        amount:     numAmount,
        method,
        successUrl: window.location.origin,
      });

      toast.dismiss('chargily');

      const { checkoutUrl } = result.data;

      if (!checkoutUrl) throw new Error('لم يتم استلام رابط الدفع من الخادم.');

      // ── 2. إعادة توجيه المستخدم لبوابة Chargily ─────────────
      toast.success('جاري نقلك لبوابة الدفع الآمنة...', {
        icon: <ShieldCheck className="w-5 h-5 text-brand-green" />,
        duration: 2000,
      });

      // تأخير بسيط لإظهار رسالة النجاح قبل الانتقال
      setTimeout(() => {
        window.location.href = checkoutUrl;
      }, 1500);

    } catch (error: any) {
      toast.dismiss('chargily');
      setLoading(false);

      const msg =
        error?.code === 'functions/unauthenticated'  ? 'يجب تسجيل الدخول أولاً.' :
        error?.code === 'functions/invalid-argument'  ? error.message :
        error?.code === 'functions/failed-precondition' ? 'بوابة الدفع غير مُهيأة. يرجى التواصل مع الدعم.' :
        'حدث خطأ في بوابة الدفع. حاول مجدداً أو تواصل مع الدعم.';

      toast.error(msg, {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
        duration: 5000,
      });

      console.error('Chargily checkout error:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Coins className="w-8 h-8 text-brand-green" />
        </div>
        <h1 className="text-4xl font-bold mb-3">شحن الرصيد</h1>
        <p className="text-gray-500">
          رصيدك الحالي:{' '}
          <span className="font-black text-brand-navy text-lg">{profile?.balance || 0} دج</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Form ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <form onSubmit={handlePayment} className="bg-white p-8 rounded-[40px] shadow-xl border border-gray-100 space-y-8">

            {/* Step 1: طريقة الدفع */}
            <div className="space-y-4">
              <label className="text-lg font-bold text-brand-navy flex items-center gap-2">
                <span className="w-7 h-7 bg-brand-navy text-white rounded-full flex items-center justify-center text-sm font-black">1</span>
                اختر طريقة الدفع
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Edahabia */}
                <button
                  type="button"
                  id="method-edahabia"
                  onClick={() => setMethod('edahabia')}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group ${
                    method === 'edahabia'
                      ? 'border-brand-gold bg-brand-gold/5 shadow-lg shadow-brand-gold/10'
                      : 'border-gray-100 hover:border-brand-gold/30'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    method === 'edahabia'
                      ? 'bg-brand-gold text-brand-navy'
                      : 'bg-gray-50 text-gray-400 group-hover:bg-brand-gold/10 group-hover:text-brand-gold'
                  }`}>
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-lg mb-1">البطاقة الذهبية</h3>
                    <p className="text-[10px] text-gray-400">Edahabia — دفع فوري وآمن</p>
                  </div>
                  {method === 'edahabia' && <CheckCircle2 className="w-6 h-6 text-brand-gold" />}
                </button>

                {/* Baridimob */}
                <button
                  type="button"
                  id="method-baridimob"
                  onClick={() => setMethod('baridimob')}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group ${
                    method === 'baridimob'
                      ? 'border-brand-navy bg-brand-navy/5 shadow-lg shadow-brand-navy/10'
                      : 'border-gray-100 hover:border-brand-navy/30'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    method === 'baridimob'
                      ? 'bg-brand-navy text-white'
                      : 'bg-gray-50 text-gray-400 group-hover:bg-brand-navy/10 group-hover:text-brand-navy'
                  }`}>
                    <Zap className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-lg mb-1">بريدي موب</h3>
                    <p className="text-[10px] text-gray-400">BaridiMob — عبر التطبيق</p>
                  </div>
                  {method === 'baridimob' && <CheckCircle2 className="w-6 h-6 text-brand-navy" />}
                </button>

              </div>
            </div>

            {/* Step 2: المبلغ */}
            <div className="space-y-4">
              <label className="text-lg font-bold text-brand-navy flex items-center gap-2">
                <span className="w-7 h-7 bg-brand-navy text-white rounded-full flex items-center justify-center text-sm font-black">2</span>
                أدخل المبلغ (دج) — الحد الأدنى 200 دج
              </label>

              {/* مبالغ سريعة */}
              <div className="flex gap-2 flex-wrap">
                {QUICK_AMOUNTS.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      amount === String(q)
                        ? 'bg-brand-green text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-brand-green/10 hover:text-brand-green'
                    }`}
                  >
                    {q.toLocaleString('ar-DZ')} دج
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="number"
                  id="payment-amount"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="أو أدخل مبلغاً مخصصاً..."
                  min={200}
                  className="w-full bg-gray-50 border-none rounded-3xl px-8 py-5 text-2xl font-bold text-brand-navy focus:ring-2 focus:ring-brand-green transition-all"
                  required
                />
                <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">دج</span>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              id="submit-payment"
              disabled={loading || !amount || !method}
              whileTap={!loading && amount && method ? { scale: 0.97 } : {}}
              className={`w-full py-5 rounded-3xl font-bold text-xl transition-all flex items-center justify-center gap-3 shadow-xl ${
                loading || !amount || !method
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-brand-green text-white hover:bg-brand-green/90 shadow-brand-green/25'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  جاري إنشاء جلسة الدفع...
                </>
              ) : (
                <>
                  تأكيد وشحن الرصيد عبر Chargily
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </motion.button>

            <p className="text-center text-xs text-gray-400">
              سيتم نقلك لصفحة الدفع الآمنة لـ Chargily Pay — لا نحتفظ ببيانات بطاقتك
            </p>
          </form>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Chargily Info Card */}
          <div className="bg-brand-navy p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/20 rounded-full -mr-16 -mt-16 blur-3xl" />
            <ShieldCheck className="w-12 h-12 text-brand-green mb-6 relative z-10" />
            <h3 className="text-xl font-bold mb-4 relative z-10">لماذا Chargily Pay؟</h3>
            <ul className="space-y-4 text-sm text-gray-300 relative z-10">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 flex-shrink-0" />
                <span>مدفوعات آمنة 100% عبر بروتوكول HTTPS مُشفَّر.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 flex-shrink-0" />
                <span>شحن فوري للرصيد بمجرد اكتمال الدفع تلقائياً.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 flex-shrink-0" />
                <span>دعم البطاقة الذهبية (Edahabia) وبريدي موب.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 flex-shrink-0" />
                <span>لا نخزّن أي بيانات بنكية — كل شيء عبر Chargily.</span>
              </li>
            </ul>
            <a
              href="https://pay.chargily.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center gap-2 text-xs text-brand-green hover:underline font-bold relative z-10"
            >
              زيارة موقع Chargily <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Alert */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-brand-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 font-bold leading-relaxed">
              في حال واجهت أي مشكلة أثناء الدفع أو لم يُشحن رصيدك، يرجى التواصل عبر{' '}
              <Link to="/chats" className="text-brand-green hover:underline">المحادثات المباشرة</Link>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PaymentsPage;
