import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Clock, ChevronRight, Search, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// 1. استدعاءات Realtime Database (للرسائل)
import { ref, push, onValue, query as rtdbQuery, limitToLast, serverTimestamp as rtdbTimestamp } from 'firebase/database';

// 2. استدعاءات Firestore (للمحادثات والأساتذة)
import { collection, addDoc, query as firestoreQuery, orderBy, onSnapshot, serverTimestamp as firestoreTimestamp, where, doc, getDocs, updateDoc, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, rtdb, functions, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../App';
import { toast } from 'sonner';

const NormalChat = () => {
  const { user, profile } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedChat = chats.find(c => c.id === selectedChatId);

  // 1. جلب المحادثات الأساسية من Firestore
  useEffect(() => {
    if (!user || !profile) return;

    const chatRef = collection(db, 'chats');
    const q = firestoreQuery(
      chatRef,
      where('participants', 'array-contains', user.uid),
      where('type', '==', 'normal'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(chatsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
      setLoading(false);
    });

    return unsubscribe;
  }, [user, profile]);

  // 2. جلب الأساتذة للقائمة المنبثقة من Firestore
  useEffect(() => {
    if (showNewChatModal) {
      const fetchTeachers = async () => {
        const q = firestoreQuery(collection(db, 'teachers'), limit(20));
        const snapshot = await getDocs(q);
        setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };
      fetchTeachers();
    }
  }, [showNewChatModal]);

  // 3. جلب وعرض الرسائل من Realtime Database اللحظية 🚀
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    // استخدام استعلام Realtime Database لقراءة آخر 50 رسالة
    const messagesRef = rtdbQuery(ref(rtdb, `messages/${selectedChatId}`), limitToLast(50));

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // تحويل البيانات من كائن Object إلى مصفوفة Array ليتم عرضها بسهولة
        const messageList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setMessages(messageList);
      } else {
        setMessages([]);
      }
      setMessagesLoading(false);
      
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      console.error('Error fetching RTDB messages:', error);
      setMessagesLoading(false);
    });

    // إغلاق الاستماع عند الخروج أو تغيير المحادثة
    return () => unsubscribe();
  }, [selectedChatId]);

  // إرسال رسالة جديدة
  const handleSend = async () => {
    if (!message.trim() || !user || !selectedChatId || !selectedChat) return;

    try {
      const msgData = {
        chatId: selectedChatId,
        text: message,
        senderId: user.uid,
        senderName: user.displayName || (profile?.role === 'teacher' ? 'أستاذ' : 'تلميذ'),
        teacherId: selectedChat.teacherId,
        studentId: selectedChat.studentId,
        isPremium: false,
        createdAt: rtdbTimestamp(), // وقت خاص بـ Realtime Database
      };

      // الدفع إلى Realtime Database
      await push(ref(rtdb, `messages/${selectedChatId}`), msgData);
      
      // تحديث آخر رسالة والوقت في قوائم المحادثات في Firestore
      await updateDoc(doc(db, 'chats', selectedChatId), {
        lastMessage: message,
        updatedAt: firestoreTimestamp() // وقت خاص بـ Firestore
      });

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // بدأ محادثة جديدة كلياً
  const startNewChat = async (teacher: any) => {
    if (!user || !profile) return;

    // التحقق مما إذا كانت المحادثة موجودة مسبقاً
    const existingChat = chats.find(c => c.teacherId === teacher.id);
    if (existingChat) {
      setSelectedChatId(existingChat.id);
      setShowNewChatModal(false);
      return;
    }

    // --- نظام الدفع بالنقاط للمحادثة العادية ---
    if (profile.role === 'student' && !profile.isSubscribed) {
      if ((profile.points || 0) < 100) {
        toast.error('تحتاج إلى 100 نقطة أو اشتراك فعّال لفتح محادثة جديدة.');
        return;
      }
      try {
        // استدعاء دالة الخادم الآمنة بدلاً من الكتابة المباشرة
        const spendPoints = httpsCallable(functions, 'spendPoints');
        await spendPoints({ amount: 100, reason: 'normal_chat' });
        toast.success('تم خصم 100 نقطة لفتح المحادثة!');
      } catch (e: any) {
        const msg = e?.message?.includes('resource-exhausted')
          ? 'رصيدك غير كافِ. أكمل المزيد من الدروس لتجميع النقاط.'
          : 'حدث خطأ أثناء معالجة الدفع';
        toast.error(msg);
        return;
      }
    }

    try {
      const chatData = {
        participants: [user.uid, teacher.id],
        studentId: user.uid,
        teacherId: teacher.id,
        studentName: profile.name || 'تلميذ',
        teacherName: teacher.name || 'أستاذ',
        type: 'normal',
        updatedAt: firestoreTimestamp(),
        lastMessage: ''
      };

      // إنشاء المحادثة في Firestore
      const docRef = await addDoc(collection(db, 'chats'), chatData);
      
      // اختيارها مباشرة دون إرسال رسائل فارغة، الرسالة سيتم إرسالها من المربع أدناه
      setSelectedChatId(docRef.id);
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
                  className="p-2 bg-brand-green text-white rounded-xl hover:bg-brand-green/90 transition-all"
                >
                  <Plus className="w-5 h-5" />
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
                  <ChevronRight className={`w-4 h-4 ${selectedChatId === chat.id ? 'text-white' : 'text-gray-300'}`} />
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
              <div className="bg-white p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedChatId(null)}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center text-white font-bold">
                    {(profile?.role === 'teacher' ? selectedChat.studentName : selectedChat.teacherName)?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-navy">
                      {profile?.role === 'teacher' ? selectedChat.studentName : selectedChat.teacherName}
                    </h3>
                    <span className="text-[10px] text-brand-green flex items-center gap-1 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                      نشط الآن
                    </span>
                  </div>
                </div>
                <div className="bg-brand-navy/5 px-3 py-1 rounded-lg text-[10px] font-bold text-brand-navy/60">
                  محادثة عادية
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
                    <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-4 rounded-3xl shadow-sm max-w-[80%] ${
                        msg.senderId === user?.uid 
                          ? 'bg-brand-green text-white rounded-tl-none' 
                          : 'bg-white text-brand-navy rounded-tr-none border border-gray-100'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <div className={`text-[9px] mt-2 flex items-center gap-1 ${msg.senderId === user?.uid ? 'text-white/70' : 'text-gray-400'}`}>
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
              <div className="p-4 max-h-[400px] overflow-y-auto space-y-2">
                {teachers.length === 0 ? (
                  <p className="text-center py-10 text-gray-400">لا يوجد أساتذة متاحون حالياً</p>
                ) : (
                  teachers.map(teacher => (
                    <button
                      key={teacher.id}
                      onClick={() => startNewChat(teacher)}
                      className="w-full p-4 rounded-2xl flex items-center gap-4 hover:bg-gray-50 transition-all border border-transparent hover:border-brand-green/20"
                    >
                      <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green font-bold text-lg">
                        {teacher.name?.[0]}
                      </div>
                      <div className="text-right">
                        <h4 className="font-bold text-brand-navy">{teacher.name}</h4>
                        <p className="text-xs text-gray-500">{teacher.subject}</p>
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
