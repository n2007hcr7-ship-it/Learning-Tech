import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. التعامل مع طلبات CORS (ضروري للمتصفح)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. التحقق من المصادقة (التأكد أن من يطلب هو مستخدم مسجل)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('غير مصرح لك بالوصول. يجب تسجيل الدخول.')
    }

    // 3. استلام عنوان الفيديو من React
    const { title } = await req.json()
    if (!title) {
      throw new Error('يجب إرفاق عنوان للفيديو (title).')
    }

    // المفاتيح (يفضل وضعها في Deno Secrets الخاص بلوحة التحكم لاحقاً)
    const API_KEY = Deno.env.get('BUNNY_API_KEY') || 'eee84b6d-53b6-4514-8d8adbf3fb53-4594-45ce'
    const LIBRARY_ID = '640218'

    // 4. إعداد واجهة الفيديو في مكتبة Bunny
    const createRes = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`, {
      method: "POST",
      headers: {
        "AccessKey": API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ title })
    })

    const createData = await createRes.json()
    if (!createRes.ok) {
      console.error(createData);
      throw new Error("حدث خطأ من خوادم Bunny Stream.")
    }

    const videoId = createData.guid

    // 5. صناعة التوقيع المشفر (SHA-256) 
    const expirationTime = Math.floor(Date.now() / 1000) + (12 * 3600) // صلاحية 12 ساعة
    const signatureString = `${LIBRARY_ID}${API_KEY}${expirationTime}${videoId}`
    
    // تشفير التوقيع في بيئة Deno
    const encoder = new TextEncoder()
    const data = encoder.encode(signatureString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signatureHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // 6. إرسال التصريح للواجهة الأمامية
    return new Response(JSON.stringify({ 
      libraryId: LIBRARY_ID, 
      videoId, 
      signature: signatureHex, 
      expirationTime 
    }), {
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
