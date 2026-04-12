import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, User, Clock, Zap, Bell, ShieldCheck, ChevronRight, Search, Plus, X, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { supabase } from '../supabase';
import { useAuth } from '../App';

const PremiumChat = () => {
  const { user, profile } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subscribedTeacherIds, setSubscribedTeacherIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedChat = chats.find(c => c.id === selectedChatId);

  // جلب المحادثات المميزة من Supabase
  useEffect(() => {
    if (!user || !profile) return;

    const fetchChats = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('type', 'premium')
        .contains('participants', [user.id])
        .order('updatedAt', { ascending: false });
        
      if (!error && data) {
        setChats(data);
      }
      setLoading(false);
    };

    fetchChats();

    const channel = supabase.channel('realtime_premium_chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `participants=cs.{${user.id}}` }, (payload) => {
        fetchChats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, profile]);

  // جلب الأساتذة للقائمة المنبثقة من Supabase
  useEffect(() => {
    if (showNewChatModal) {
      if (profile?.role === 'student' && user?.id) {
        const fetchSubscriptions = async () => {
          const { data } = await supabase.from('subscriptions').select('teacherId').eq('studentId', user.id);
          if (data) {
            setSubscribedTeacherIds(data.map((sub: any) => sub.teacherId));
          }
        };
        fetchSubscriptions();
      }

      const fetchTeachers = async () => {
        const { data } = await supabase.from('teachers').select('*').limit(50);
        if (data) {
          setTeachers(data);
        }
      };
      
      fetchTeachers();
      setSearchTerm('');
    }
  }, [showNewChatModal, user?.id, profile?.role]);

  // جلب الرسائل وعرضها عبر Supabase اللحظية ⚡
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

    const channel = supabase.channel('realtime_premium_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chatId=eq.${selectedChatId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as any]);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChatId]);

  const handleSend = async () => {
    if (!message.trim() || !user || !selectedChatId || !selectedChat) return;

    try {
      const msgData = {
        chatId: selectedChat.id,
        text: message,
        senderId: user.id,
        senderName: profile?.name || user.user_metadata?.display_name || (profile?.role === 'teacher' ? 'أستاذ' : 'تلميذ مميز'),
        teacherId: selectedChat.teacherId,
        studentId: selectedChat.studentId,
        isPremium: true,
        createdAt: new Date().toISOString(),
      };

      await supabase.from('messages').insert(msgData);
      
      await supabase.from('chats').update({
        lastMessage: message,
        updatedAt: new Date().toISOString()
      }).eq('id', selectedChat.id);

      if (profile?.role === 'student') {
        toast.success('تم إرسال إشعار فوري وقوي للأستاذ!', {
          icon: <Zap className="w-5 h-5 text-brand-gold" />,
          description: 'سيصل تنبيه للأستاذ لضمان الرد السريع.',
        });
      }

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const startNewChat = async (teacher: any) => {
    if (!user || !profile) return;

    const existingChat = chats.find(c => c.teacherId === teacher.id);
    if (existingChat) {
      setSelectedChatId(existingChat.id);
      setShowNewChatModal(false);
      return;
    }

    const price = teacher.pricing?.premiumChat || 1000;

    if (profile.role === 'student' && !profile.isSubscribed) {
      if ((profile.balance || 0) < price) {
        toast.error(`تحتاج إلى ${price} دج أو اشتراك فعّال لفتح محادثة مميزة.`);
        return;
      }
      try {
        const { error } = await supabase.rpc('process_service_payment', { amount: price, reason: 'premium_chat', teacher_id: teacher.id });
        if (error) throw error;
        toast.success(`تم خصم ${price} دج من رصيدك لفتح المحادثة المميزة! ⚡`);
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
        type: 'premium',
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
      <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden flex h-[700px] border-2 border-brand-gold/20">
        
        {/* Sidebar: Chat List */}
        <div className={`w-full md:w-80 border-l border-gray-100 flex flex-col ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-gray-100 bg-brand-gold/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-gold" />
                <h2 className="text-2xl font-bold">المميزة</h2>
              </div>
              {profile?.role === 'student' && (
                <button 
                  onClick={() => setShowNewChatModal(true)}
                  className="px-4 py-2 bg-brand-gold text-brand-navy rounded-xl hover:bg-brand-gold/90 transition-all flex items-center gap-2 text-sm font-bold"
                >
                  <Plus className="w-4 h-4" />
                  إنشاء محادثة مميزة
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="بحث عن محادثة مميزة..."
                className="w-full bg-white border-none rounded-xl pr-10 py-2 text-sm focus:ring-2 focus:ring-brand-gold"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chats.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <Zap className="w-12 h-12 mx-auto mb-2 text-brand-gold" />
                <p className="text-sm">لا توجد محادثات مميزة حالياً</p>
                {profile?.role === 'student' && (
                  <button 
                    onClick={() => setShowNewChatModal(true)}
                    className="mt-4 text-brand-gold font-bold text-xs"
                  >
                    ابدأ محادثة مميزة جديدة
                  </button>
                )}
              </div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${
                    selectedChatId === chat.id ? 'bg-brand-gold text-brand-navy shadow-lg shadow-brand-gold/20' : 'hover:bg-brand-gold/5'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    selectedChatId === chat.id ? 'bg-white/40' : 'bg-brand-gold/10 text-brand-gold'
                  }`}>
                    {(profile?.role === 'teacher' ? chat.studentName : chat.teacherName)?.[0] || '؟'}
                  </div>
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-sm truncate">
                      {profile?.role === 'teacher' ? chat.studentName : chat.teacherName}
                    </h4>
                    <p className={`text-xs truncate ${selectedChatId === chat.id ? 'text-brand-navy/70' : 'text-gray-500'}`}>
                      {chat.lastMessage || 'ابدأ المحادثة المميزة الآن...'}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${selectedChatId === chat.id ? 'text-brand-navy' : 'text-gray-300'}`} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col bg-gray-50/50 ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          {selectedChat ? (
            <>
              {/* Header */}
              <div className="bg-white p-4 border-b border-gray-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedChatId(null)}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-brand-gold flex items-center justify-center text-brand-navy font-bold">
                    {(profile?.role === 'teacher' ? selectedChat.studentName : selectedChat.teacherName)?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-navy">
                      {profile?.role === 'teacher' ? selectedChat.studentName : selectedChat.teacherName}
                    </h3>
                    <span className="text-[10px] text-brand-green flex items-center gap-1 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                      نشط الآن (أولوية قصوى)
                    </span>
                  </div>
                </div>
                <div className="bg-brand-gold text-brand-navy px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
                  <ShieldCheck className="w-3 h-3" />
                  محادثة مميزة
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messagesLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <Zap className="w-16 h-16 mb-4 text-brand-gold" />
                    <p className="font-bold">ابدأ المحادثة المميزة للحصول على رد سريع</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-4 rounded-3xl shadow-sm max-w-[80%] ${
                        msg.senderId === user?.id 
                          ? 'bg-brand-gold text-brand-navy rounded-tl-none' 
                          : 'bg-white text-brand-navy rounded-tr-none border border-gray-100'
                      } ring-1 ring-brand-gold/10`}>
                        <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                        <div className={`text-[9px] mt-2 flex items-center gap-1 ${msg.senderId === user?.id ? 'text-brand-navy/60' : 'text-gray-400'}`}>
                          <Clock className="w-3 h-3" />
                          {msg.createdAt 
                            ? new Date(msg.createdAt).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }) 
                            : 'الآن'}
                        </div>
                      </div>
                    </div>
                  ))
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
                    placeholder="اكتب رسالتك المميزة هنا..."
                    className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-brand-gold transition-all"
                  />
                  <button 
                    onClick={handleSend}
                    className="p-4 rounded-2xl bg-brand-gold text-brand-navy transition-all transform active:scale-95 shadow-lg shadow-brand-gold/20"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
                <div className="mt-4 p-3 bg-brand-gold/10 rounded-xl flex items-center gap-3 border border-brand-gold/20">
                  <div className="w-8 h-8 bg-brand-gold rounded-lg flex items-center justify-center text-brand-navy">
                    <Bell className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-brand-navy">الرد على التلميذ يأخذ وقت أقل في الشات المميزة</p>
                    <p className="text-[10px] text-brand-navy/60">سيصل تنبيه فوري للأستاذ لضمان سرعة الاستجابة.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-24 h-24 bg-white rounded-[40px] shadow-2xl flex items-center justify-center mb-8 border-2 border-brand-gold/20">
                <Zap className="w-12 h-12 text-brand-gold" />
              </div>
              <h3 className="text-2xl font-bold text-brand-navy mb-4">اختر محادثة مميزة</h3>
              <p className="text-gray-500 max-w-xs">
                في المحادثة المميزة، يحصل {profile?.role === 'teacher' ? 'طلابك' : 'أنت'} على أولوية قصوى في الرد والتفاعل.
              </p>
              {profile?.role === 'student' && (
                <button 
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-8 bg-brand-gold text-brand-navy px-8 py-3 rounded-2xl font-bold hover:bg-brand-gold/90 transition-all shadow-lg shadow-brand-gold/20"
                >
                  ابدأ محادثة مميزة جديدة
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
              className="relative bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl border-2 border-brand-gold/20"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand-gold/5">
                <h3 className="text-xl font-bold">ابدأ محادثة مميزة</h3>
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
                    className="w-full bg-white border border-brand-gold/20 rounded-xl pr-10 py-2.5 text-sm focus:ring-2 focus:ring-brand-gold focus:border-brand-gold transition-all outline-none"
                  />
                </div>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto space-y-2">
                {teachers.length === 0 ? (
                  <p className="text-center py-10 text-gray-400">لا يوجد أساتذة متاحون حالياً</p>
                ) : (
                  teachers
                    .filter(t => t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || t.subject?.includes(searchTerm))
                    .sort((a, b) => {
                      const aSub = subscribedTeacherIds.includes(a.id) ? 1 : 0;
                      const bSub = subscribedTeacherIds.includes(b.id) ? 1 : 0;
                      return bSub - aSub; // Show subscribed teachers first
                    })
                    .map(teacher => {
                    const isSubscribed = subscribedTeacherIds.includes(teacher.id);
                    return (
                    <button
                      key={teacher.id}
                      onClick={() => startNewChat(teacher)}
                      className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all border ${isSubscribed ? 'bg-brand-gold/10 border-brand-gold/30 hover:bg-brand-gold/20' : 'hover:bg-brand-gold/5 border-transparent'}`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${isSubscribed ? 'bg-brand-gold text-brand-navy' : 'bg-brand-gold/10 text-brand-gold'}`}>
                        {teacher.name?.[0]}
                      </div>
                      <div className="text-right flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-brand-navy">{teacher.name}</h4>
                          {isSubscribed && (
                           <span className="text-[10px] bg-brand-gold text-brand-navy px-2 py-0.5 rounded-full font-bold">مشترك</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{teacher.subject}</p>
                      </div>
                      <div className="font-bold text-sm text-brand-gold flex items-center gap-1 bg-white shadow-sm border border-brand-gold/20 px-3 py-1.5 rounded-xl">
                        <CreditCard className="w-4 h-4" />
                        {teacher.pricing?.premiumChat || 1000} دج
                      </div>
                    </button>
                    )
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PremiumChat;
