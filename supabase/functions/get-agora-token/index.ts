import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// استيراد الحزمة مباشرة من npm عبر Deno
import { RtcTokenBuilder, RtcRole } from "npm:agora-access-token@2.0.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. استلام معلومات البث من التطبيق
    const { channelName, uid } = await req.json()
    if (!channelName) {
      throw new Error('اسم الغرفة (channelName) مطلوب')
    }

    // 2. إعداد مفاتيح Agora (يفضل تخزينها في Deno Secrets في لوحة التحكم)
    // كمرحلة مؤقتة سنقرأ من ملف .env الخاص بالمتصفح أو قيم افتراضية
    const APP_ID = Deno.env.get('AGORA_APP_ID') || 'a9094033fe9643d995aa0425a75cfdd4';
    const APP_CERTIFICATE = Deno.env.get('AGORA_APP_CERTIFICATE') || '3d4ec741fded4eed823cbcc79555caab';

    // 3. تحديد صلاحية التوكن (مثلا: ساعتان = 7200 ثانية)
    const expirationTimeInSeconds = 7200;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // 4. بناء التوكن
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid || 0,
      RtcRole.PUBLISHER, // الأستاذ يبث، والتلميذ أيضاً يمكنه التحدث
      privilegeExpiredTs
    );

    // 5. إرجاع التوكن المشفر
    return new Response(JSON.stringify({ token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
