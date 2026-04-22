import { useState, useEffect, useRef } from 'react';
import { Send, Clock, X, Plus, Brain, Sparkles, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useAuth } from '../App';
import { toast } from 'sonner';

const NormalChat = () => {
  const { user, profile } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiTyping, setAiTyping] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // استخدام المعرف الخاص بالمستخدم كـ chatId للمحادثة الذكية (لضمان كونه UUID صالح)
  const AI_CHAT_ID = user?.id;

  // 1. التأكد من وجود سجل للمحادثة الذكية في جدول chats
  useEffect(() => {
    if (!user || !AI_CHAT_ID || !profile || profile.needsRole) return;

    const initAiChat = async () => {
      try {
        // التحقق من وجود السجل
        const { data: existingChat } = await supabase
          .from('chats')
          .select('id')
          .eq('id', AI_CHAT_ID)
          .maybeSingle();

        if (!existingChat) {
          // إنشاء سجل محادثة AI إذا لم يوجد
          await supabase.from('chats').upsert({
            id: AI_CHAT_ID,
            participants: [user.id],
            studentId: user.id,
            studentName: profile?.name || 'تلميذ',
            type: 'ai',
            lastMessage: 'مرحباً بك!',
            updatedAt: new Date().toISOString()
          }, { onConflict: 'id' });
        }

        // جلب الرسائل
        const { data: initialMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('chatId', AI_CHAT_ID)
          .order('createdAt', { ascending: true });
        
        if (initialMessages) setMessages(initialMessages);
      } catch (err) {
        console.error('Chat Init Error:', err);
      } finally {
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };

    initAiChat();

    // الاشتراك في الرسائل الجديدة لحظياً
    const channel = supabase.channel(`ai_messages_${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `chatId=eq.${AI_CHAT_ID}` 
      }, (payload) => {
        setMessages((prev) => {
          // تجنب تكرار الرسائل المحملة مسبقاً
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as any];
        });
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, AI_CHAT_ID, profile?.name]);

  // 2. معالجة رفع الملفات
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setAttachments([{
        inlineData: {
          data: base64String,
          mimeType: file.type
        },
        preview: URL.createObjectURL(file)
      }]);
    };
    reader.readAsDataURL(file);
  };

  // 3. إرسال الرسالة ومعالجة رد AI (باستخدام مكتبة @google/genai الجديدة)
  const handleSend = async () => {
    if ((!message.trim() && attachments.length === 0) || !user || !AI_CHAT_ID || !profile || profile.needsRole) return;
    
    const userMsg = message;
    const currentAttachments = [...attachments];
    
    setMessage('');
    setAttachments([]);

    try {
      // حفظ رسالة المستخدم في قاعدة البيانات
      const msgData = {
        chatId: AI_CHAT_ID,
        text: userMsg || 'تم إرسال وسائط',
        senderId: user.id,
        senderName: profile?.name || 'تلميذ',
        isAI: false,
        createdAt: new Date().toISOString()
      };
      await supabase.from('messages').insert(msgData);

      setAiTyping(true);
      
      const systemPrompt = `أنت هو المساعد التعليمي الذكي "قما 2" (Gemma 2) لمنصة Learning Tech في الجزائر.
أنت خبير في المناهج الوزارية والتربوية الجزائرية لجميع الأطوار.
قواعدك: لا تعطِ الحل مباشرة، قدم تلميحات أولاً، وإذا عجز الطالب قدم الحل المفصل حسب المنهج الجزائري.
تحدث بلهجة جزائرية بيضاء أو عربية مبسطة. ردك نصي فقط ومشجع.`;

      // بناء المحتوى للمكتبة الجديدة @google/genai
      const parts: any[] = [{ text: systemPrompt }];
      
      // إضافة الصور إن وجدت
      currentAttachments.forEach(att => {
        parts.push({
          inlineData: {
            data: att.inlineData.data,
            mimeType: att.inlineData.mimeType
          }
        });
      });

      // إضافة سؤال المستخدم
      parts.push({ text: `سؤال التلميذ: ${userMsg}` });

      // استدعاء Gemini عبر البروكسي المجاني لتجاوز الحجب الجغرافي دون الحاجة لتدخل المستخدم
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) throw new Error("مفتاح الذكاء الاصطناعي مفقود!");

      const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
      const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: parts }] })
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Proxy error:", data);
        throw new Error(data.error?.message || "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي");
      }

      const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // حفظ رد المساعد في قاعدة البيانات
      const aiMsgData = {
        chatId: AI_CHAT_ID,
        text: aiReply,
        senderId: user.id, // Must be user.id to pass RLS and UUID requirements
        senderName: 'المساعد الذكي (Gemma)',
        isAI: true,
        createdAt: new Date().toISOString()
      };
      await supabase.from('messages').insert(aiMsgData);
      
    } catch (error) {
      console.error('AI Error:', error);
      toast.error('عذراً، حدث خطأ في معالجة طلبك');
    } finally {
      setAiTyping(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[500px]">
      <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Info */}
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-brand-navy to-brand-green p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              المساعد الذكي قما 2
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            </h1>
            <p className="text-sm opacity-80 font-bold">خبير المنهج الجزائري - متاح مجاناً 🇩🇿</p>
          </div>
        </div>
        <div className="bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10 flex items-center gap-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-bold">نشط الآن</span>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[650px] border border-gray-100">
        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-20 h-20 bg-gray-200 rounded-[30px] flex items-center justify-center mb-6">
                <MessageCircle className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-brand-navy mb-2">مرحباً بك في فضائك الذكي</h3>
              <p className="text-sm max-w-xs leading-relaxed">أدخل سؤالك أو ارفع صورة لتمرينك وسأساعدك في فهمه وحله خطوة بخطوة.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className={`flex ${msg.isAI ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`p-5 rounded-3xl max-w-[85%] shadow-sm ${
                  msg.isAI 
                    ? 'bg-white text-brand-navy border border-gray-100 rounded-tl-sm' 
                    : 'bg-brand-green text-white rounded-tr-sm'
                }`}>
                  {msg.isAI && (
                    <div className="flex items-center gap-1.5 text-brand-green text-[10px] font-black mb-2 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      قما 2 (ذكاء اصطناعي)
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <div className={`text-[9px] mt-3 flex items-center gap-1 ${msg.isAI ? 'text-gray-400' : 'text-white/70'}`}>
                    <Clock className="w-3 h-3" />
                    {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))
          )}
          
          {aiTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 p-5 rounded-3xl rounded-tl-sm shadow-sm flex items-center gap-3">
                <Brain className="w-5 h-5 text-brand-green animate-pulse" />
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                      className="w-2 h-2 bg-brand-green/30 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Action Bar */}
        <div className="p-6 bg-white border-t border-gray-100">
          {attachments.length > 0 && (
            <div className="mb-4 flex gap-2">
              <div className="relative group">
                <img src={attachments[0].preview} className="w-20 h-20 object-cover rounded-2xl border-2 border-brand-green shadow-lg" alt="" />
                <button 
                  onClick={() => setAttachments([])}
                  className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 items-center">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-brand-green transition-all shadow-inner"
            >
              <Plus className="w-6 h-6" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileUpload}
            />
            
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="اكتب سؤالك هنا أو ارفع صورة..."
              className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-brand-green transition-all shadow-inner"
            />
            
            <button 
              onClick={handleSend}
              disabled={aiTyping || (!message.trim() && attachments.length === 0)}
              className="p-4 rounded-2xl bg-brand-green text-white shadow-xl shadow-brand-green/20 disabled:opacity-50 disabled:grayscale transition-all transform active:scale-90"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
          
          <p className="text-center text-[10px] text-gray-400 mt-4 font-medium">
             سيقوم المساعد الذكي Gemma 2 بالرد عليك فوراً بناءً على المنهج الدراسي الجزائري 🇩🇿
          </p>
        </div>
      </div>
    </div>
  );
};

export default NormalChat;
