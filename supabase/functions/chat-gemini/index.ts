import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    })
  }

  try {
    const { message, imageBase64, imageMimeType } = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('مفتاح GEMINI_API_KEY غير متوفر في السيرفر');
    }

    const systemPrompt = `أنت هو المساعد التعليمي الذكي "قما 2" (Gemma 2) لمنصة Learning Tech في الجزائر.
أنت خبير في المناهج الوزارية والتربوية الجزائرية لجميع الأطوار.
قواعدك: لا تعطِ الحل مباشرة، قدم تلميحات أولاً، وإذا عجز الطالب قدم الحل المفصل حسب المنهج الجزائري.
تحدث بلهجة جزائرية بيضاء أو عربية مبسطة. ردك نصي فقط ومشجع.`;

    const parts: any[] = [{ text: systemPrompt }];

    if (imageBase64 && imageMimeType) {
      parts.push({ inlineData: { data: imageBase64, mimeType: imageMimeType } });
    }

    parts.push({ text: `سؤال التلميذ: ${message || 'انظر للصورة المرفقة'}` });

    const contents = [{ role: 'user', parts }];

    // نجرب النماذج بالترتيب — إذا نفدت حصة الأول ننتقل للتالي
    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.0-pro'];
    let lastData: any = null;

    for (const model of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      });

      lastData = await response.json();

      if (response.ok && lastData.candidates?.[0]?.content?.parts?.[0]?.text) {
        const reply = lastData.candidates[0].content.parts[0].text;
        console.log(`✅ Gemini (${model}) responded`);
        return new Response(
          JSON.stringify({ reply }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const status = lastData?.error?.status || '';
      if (status !== 'RESOURCE_EXHAUSTED') {
        console.error(`Model ${model} failed:`, lastData);
        break;
      }
      console.warn(`Model ${model} quota exhausted, trying next...`);
    }

    // فشلت جميع المحاولات
    const errStatus = lastData?.error?.status || '';
    const statusCode = errStatus === 'RESOURCE_EXHAUSTED' ? 429 : 500;
    const errMsg = errStatus === 'RESOURCE_EXHAUSTED'
      ? 'quota_exhausted'
      : (lastData?.error?.message || 'حدث خطأ في Gemini');

    return new Response(
      JSON.stringify({ error: errMsg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
