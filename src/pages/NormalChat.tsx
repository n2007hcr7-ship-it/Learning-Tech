import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Clock, Search, Plus, X, Zap, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../supabase';
import { useAuth } from '../App';
import { toast } from 'sonner';

const NormalChat = () => {
  const { user, profile } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiTyping, setAiTyping] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [iqCoins, setIqCoins] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedChat = chats.find(c => c.id === selectedChatId);
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

  // 1. جلب المحادثات الأساسية من Supabase
  useEffect(() => {
    if (!user || !profile) return;

    const fetchChats = async () => {
      const { data } = await supabase
        .from('chats')
        .select('*')
        .eq('type', 'normal')
        .contains('participants', [user.id])
        .order('updatedAt', { ascending: false });
      if (data) setChats(data);
      setLoading(false);
    };

    // جلب رصيد IQ Coins
    const fetchCoins = async () => {
      const { data } = await supabase.from('users').select('iq_coins').eq('id', user.id).single();
      if (data) setIqCoins(data.iq_coins || 0);
    };

    fetchChats();
    fetchCoins();

    const channel = supabase.channel('realtime_chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => fetchChats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, profile]);

  // 2. جلب الأساتذة للقائمة المنبثقة
  useEffect(() => {
    if (showNewChatModal) {
      const fetchTeachers = async () => {
        const { data } = await supabase.from('teachers').select('*, users(name, email)').limit(50);
        if (data) setTeachers(data);
      };
      fetchTeachers();
      setSearchTerm('');
    }
  }, [showNewChatModal]);

  // 3. جلب وعرض الرسائل من Supabase اللحظية 🚀
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').eq('chatId', selectedChatId).order('createdAt', { ascending: true }).limit(50);
      if (data) {
        setMessages(data);
      }
      setMessagesLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    fetchMessages();

    // Supabase Realtime Subscription
    const channel = supabase.channel('realtime_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chatId=eq.${selectedChatId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as any]);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChatId]);

  // إرسال رسالة + رد الذكاء الاصطناعي تلقائياً
  const handleSend = async () => {
    if (!message.trim() || !user || !selectedChatId || !selectedChat) return;
    const userMsg = message;
    setMessage('');

    try {
      // 1. حفظ رسالة التلميذ
      const msgData = {
        chatId: selectedChatId,
        text: userMsg,
        senderId: user.id,
        senderName: profile?.name || 'تلميذ',
        teacherId: selectedChat.teacherId,
        studentId: selectedChat.studentId,
        isPremium: false,
        createdAt: new Date().toISOString(),
        isAI: false
      };
      await supabase.from('messages').insert(msgData);
      await supabase.from('chats').update({ lastMessage: userMsg, updatedAt: new Date().toISOString() }).eq('id', selectedChatId);

      // 2. رد الذكاء الاصطناعي (Gemini)
      setAiTyping(true);
      const teacherSubject = selectedChat.teacherSubject || 'علوم عامة';
      const systemPrompt = `أنت مساعد تعليمي ذكي خبير في مادة ${teacherSubject}. أجب باللغة العربية بشكل واضح ومبسط مناسب للتلميذ. أجبتك تكون مختصرة ومفيدة.`;
      
      const response = await ai.models.generateContent({
        model: 'gemma-4-26b',
        contents: `${systemPrompt}\n\nسؤال التلميذ: ${userMsg}`
      });
      
      const aiReply = response.text || 'عذراً، لم أتمكن من فهم السؤال. حاول مرة أخرى.';

      // 3. حفظ رد الذكاء الاصطناعي
      const aiMsgData = {
        chatId: selectedChatId,
        text: aiReply,
        senderId: selectedChat.teacherId,
        senderName: `مساعد ذكي (أستاذ ${selectedChat.teacherName?.split(' ')[0] || ''})`,
        teacherId: selectedChat.teacherId,
        isPremium: false,
        createdAt: new Date().toISOString(),
        isAI: true
      };
      await supabase.from('messages').insert(aiMsgData);
      await supabase.from('chats').update({ lastMessage: aiReply, updatedAt: new Date().toISOString() }).eq('id', selectedChatId);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('تعذّر إرسال الرسالة');
    } finally {
      setAiTyping(false);
    }
  };

  // بدأ محادثة جديدة كلياً
  const startNewChat = async (teacher: any) => {
    if (!user || !profile) return;

    const existingChat = chats.find(c => c.teacherId === teacher.id);
    if (existingChat) {
      setSelectedChatId(existingChat.id);
      setShowNewChatModal(false);
      return;
    }

    const price = teacher.pricing?.normalChat || 300;
    
    if (profile.role === 'student' && !profile.isSubscribed) {
      if ((profile.balance || 0) < price) {
        toast.error(`تحتاج إلى ${price} دج أو اشتراك فعّال لفتح محادثة جديدة.`);
        return;
      }
      try {
        const { error } = await supabase.rpc('process_service_payment', { amount: price, reason: 'normal_chat', teacher_id: teacher.id });
        if (error) throw error;
        toast.success(`تم خصم ${price} دج من رصيدك لفتح المحادثة!`);
      } catch (e: any) {
        toast.error('رصيدك في المحفظة غير كافِ أو حدث خطأ.');
        return;
      }
    }

    try {
      const chatData = {
        participants: [user.id, teacher.id],
        studentId: user.id,
        teacherId: teacher.id,
        studentName: profile.name || 'تلميذ',
        teacherName: teacher.name || teacher.users?.name || 'أستاذ',
        type: 'normal',
        updatedAt: new Date().toISOString(),
        lastMessage: ''
      };

      const { data, error } = await supabase.from('chats').insert(chatData).select().single();
      if (error) throw error;
      
      setSelectedChatId(data.id);
      setShowNewChatModal(false);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden flex h-[700px] border border-gray-100">
        
        {/* Sidebar: Chat List */}
        <div className={`w-full md:w-80 border-l border-gray-100 flex flex-col ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">المحادثات</h2>
              {profile?.role === 'student' && (
                <button 
                  onClick={() => setShowNewChatModal(true)}
                  className="px-4 py-2 bg-brand-green text-white rounded-xl hover:bg-brand-green/90 transition-all flex items-center gap-2 text-sm font-bold"
                >
                  <Plus className="w-4 h-4" />
                  إنشاء محادثة جديدة
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="بحث عن محادثة..."
                className="w-full bg-gray-50 border-none rounded-xl pr-10 py-2 text-sm focus:ring-2 focus:ring-brand-green"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chats.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <MessageCircle className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">لا توجد محادثات حالياً</p>
                {profile?.role === 'student' && (
                  <button 
                    onClick={() => setShowNewChatModal(true)}
                    className="mt-4 text-brand-green font-bold text-xs"
                  >
                    ابدأ محادثة جديدة مع أستاذ
                  </button>
                )}
              </div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${
                    selectedChatId === chat.id ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    selectedChatId === chat.id ? 'bg-white/20' : 'bg-brand-navy/5 text-brand-navy'
                  }`}>
                    {(profile?.role === 'teacher' ? chat.studentName : chat.teacherName)?.[0] || '؟'}
                  </div>
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-sm truncate">
                      {profile?.role === 'teacher' ? chat.studentName : chat.teacherName}
                    </h4>
                    <p className={`text-xs truncate ${selectedChatId === chat.id ? 'text-white/70' : 'text-gray-500'}`}>
                      {chat.lastMessage || 'ابدأ المحادثة الآن...'}
                    </p>
                  </div>
                  <span className={`text-xs ${selectedChatId === chat.id ? 'text-white' : 'text-gray-300'}`}>›</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col bg-gray-50/50 ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          {selectedChat ? (
            <>
                <div className="bg-white p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedChatId(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
                      <Plus className="w-6 h-6 rotate-45" />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center text-white font-bold">
                      {(profile?.role === 'teacher' ? selectedChat.studentName : selectedChat.teacherName)?.[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-navy">
                        {profile?.role === 'teacher' ? selectedChat.studentName : selectedChat.teacherName}
                      </h3>
                      <span className="text-[10px] text-purple-500 flex items-center gap-1 font-bold">
                        <Brain className="w-3 h-3" />
                        يرد بالذكاء الاصطناعي
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-lg text-[10px] font-bold text-yellow-600 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {iqCoins} IQ
                    </div>
                    <div className="bg-purple-50 px-3 py-1 rounded-lg text-[10px] font-bold text-purple-600">
                      شات + ذكاء اصطناعي
                    </div>
                  </div>
                </div>

              {/* Messages */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messagesLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <MessageCircle className="w-16 h-16 mb-4" />
                    <p className="font-bold">أرسل أول رسالة لبدء الحوار</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-4 rounded-3xl shadow-sm max-w-[80%] ${
                        msg.senderId === user?.id 
                          ? 'bg-brand-green text-white rounded-tl-none' 
                          : msg.isAI 
                            ? 'bg-purple-50 text-purple-900 rounded-tr-none border border-purple-100'
                            : 'bg-white text-brand-navy rounded-tr-none border border-gray-100'
                      }`}>
                        {msg.isAI && (
                          <div className="flex items-center gap-1 text-purple-500 text-[9px] font-bold mb-2">
                            <Brain className="w-3 h-3" />
                            مساعد ذكي
                          </div>
                        )}
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <div className={`text-[9px] mt-2 flex items-center gap-1 ${msg.senderId === user?.id ? 'text-white/70' : 'text-gray-400'}`}>
                          <Clock className="w-3 h-3" />
                          {msg.createdAt 
                            ? new Date(msg.createdAt).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }) 
                            : 'الآن'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {aiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-purple-50 border border-purple-100 px-5 py-3 rounded-3xl rounded-tr-none flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-500 animate-pulse" />
                      <span className="text-purple-600 text-xs font-medium">يفكّر…</span>
                      <div className="flex gap-1">
                        {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: `${i*0.15}s`}} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>

              {/* Input */}
              <div className="p-6 bg-white border-t border-gray-100">
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-brand-green transition-all"
                  />
                  <button 
                    onClick={handleSend}
                    className="p-4 rounded-2xl bg-brand-green text-white transition-all transform active:scale-95 shadow-lg shadow-brand-green/20"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-24 h-24 bg-white rounded-[40px] shadow-xl flex items-center justify-center mb-8">
                <MessageCircle className="w-12 h-12 text-brand-green" />
              </div>
              <h3 className="text-2xl font-bold text-brand-navy mb-4">اختر محادثة للبدء</h3>
              <p className="text-gray-500 max-w-xs">
                يمكنك التواصل مع {profile?.role === 'teacher' ? 'طلابك' : 'أساتذتك'} مباشرة وبكل سهولة من خلال هذا القسم.
              </p>
              {profile?.role === 'student' && (
                <button 
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-8 bg-brand-navy text-white px-8 py-3 rounded-2xl font-bold hover:bg-brand-navy/90 transition-all"
                >
                  ابدأ محادثة جديدة
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewChatModal(false)}
              className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold">ابدأ محادثة مع أستاذ</h3>
                <button onClick={() => setShowNewChatModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="ابحث عن أستاذ (الاسم أو المادة)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-xl pr-10 py-2.5 text-sm focus:ring-2 focus:ring-brand-green focus:border-brand-green transition-all outline-none"
                  />
                </div>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto space-y-2">
                {teachers.length === 0 ? (
                  <p className="text-center py-10 text-gray-400">لا يوجد أساتذة متاحون حالياً</p>
                ) : (
                  teachers
                    .filter(t => t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || t.subject?.includes(searchTerm))
                    .map(teacher => (
                    <button
                      key={teacher.id}
                      onClick={() => startNewChat(teacher)}
                      className="w-full p-4 rounded-2xl flex items-center gap-4 transition-all border hover:bg-gray-50 border-transparent"
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg bg-brand-green/10 text-brand-green">
                        {teacher.name?.[0] || teacher.users?.name?.[0] || '؟'}
                      </div>
                      <div className="text-right flex-1">
                        <h4 className="font-bold text-brand-navy">{teacher.name || teacher.users?.name}</h4>
                        <p className="text-xs text-gray-500">{teacher.subject}</p>
                      </div>
                      <div className="font-bold text-sm text-purple-600 flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-xl">
                        <Brain className="w-3 h-3" />
                        {teacher.pricing?.normalChat || 300} دج
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NormalChat;
