import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, Calendar, Clock, User, Zap, Lock, Plus, X, Users, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// استدعاءات Realtime Database بالإضافة للميزات الجديدة كلاً من (push و serverTimestamp)
import { ref, onValue, push, query as rtdbQuery, orderByChild, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { rtdb } from '../firebase'; 
import { useAuth } from '../App';

const LiveLessons = () => {
  const { user, profile } = useAuth();
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // إعدادات النافذة المنبثقة لإنشاء البث (خاصة بالأستاذ)
  const [showNewLiveModal, setShowNewLiveModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    time: '',
    price: '', // سعر دخول الطالب
    maxAttendees: '50', // الدقة الافتراضية
    duration: '60' // المدة بالدقائق
  });

  // جلب المحادثات والبثوث
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const liveStreamsRef = rtdbQuery(ref(rtdb, 'liveStreams'), orderByChild('createdAt'));
    
    const unsubscribe = onValue(liveStreamsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sessions = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setLiveSessions(sessions);
      } else {
        setLiveSessions([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching live streams:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // دالة إنشاء بث مباشر جديد وحفظ السعر
  const handleCreateLiveStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || profile?.role !== 'teacher') return;

    try {
      const newSession = {
        title: formData.title,
        subject: formData.subject,
        teacher: profile?.name || user.displayName || 'أستاذ',
        time: formData.time,
        price: Number(formData.price) || 0,
        maxAttendees: Number(formData.maxAttendees),
        duration: Number(formData.duration),
        status: 'upcoming', 
        viewers: 0,
        createdAt: rtdbTimestamp()
      };

      await push(ref(rtdb, 'liveStreams'), newSession);
      
      setShowNewLiveModal(false);
      setFormData({ title: '', subject: '', time: '', price: '', maxAttendees: '50', duration: '60' });
      toast.success('تم إنشاء الحصة بنجاح!');
    } catch (error) {
      console.error("Error creating live stream", error);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="w-20 h-20 bg-brand-navy/5 rounded-3xl flex items-center justify-center mx-auto mb-8">
        <Lock className="w-10 h-10 text-brand-navy" />
      </div>
      <h1 className="text-3xl font-bold mb-4">يرجى تسجيل الدخول لمشاهدة البث المباشر</h1>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        حصص البث المباشر متاحة فقط للمشتركين المسجلين في المنصة. سجل دخولك الآن للتفاعل مع الأساتذة.
      </p>
      <div className="flex justify-center gap-4">
        <Link to="/login" className="bg-brand-navy text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-navy/90 transition-all">
          تسجيل الدخول
        </Link>
        <Link to="/register" className="bg-brand-green text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-green/90 transition-all">
          إنشاء حساب جديد
        </Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">حصص البث المباشر</h1>
          <p className="text-gray-500">تفاعل مباشرة مع أفضل الأساتذة في الجزائر</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-white border border-gray-100 px-6 py-3 rounded-2xl font-bold text-sm shadow-sm hover:bg-gray-50 transition-all">
            جدول الحصص
          </button>
          
          {/* تغيير ديناميكي للأزرار بناءً على ما إذا كان المستخدم أستاذ أم تلميذ */}
          {profile?.role === 'teacher' ? (
            <button 
              onClick={() => setShowNewLiveModal(true)}
              className="bg-brand-green text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-brand-green/20 hover:bg-brand-green/90 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              إنشاء بث مباشر جديد
            </button>
          ) : (
            <button className="bg-brand-green text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-brand-green/20 hover:bg-brand-green/90 transition-all">
              اشترك في البث المباشر
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {liveSessions.map((session, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all group relative"
          >
            <div className="relative aspect-video">
              <img 
                src={`https://picsum.photos/seed/live${session.id}/600/400`} 
                alt={session.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              <div className="absolute top-4 left-4 flex gap-2">
                {session.status === 'live' ? (
                  <div className="bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-2 animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    مباشر الآن
                  </div>
                ) : (
                  <div className="bg-brand-navy/80 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-2 border border-white/10">
                    <Calendar className="w-3 h-3" />
                    قريباً
                  </div>
                )}
                
                <div className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-bold">
                  {session.subject}
                </div>

                {/* وضع شارة السعر أو "مجاني" فوق صورة البث بشكل جميل */}
                {session.price > 0 ? (
                  <div className="bg-brand-gold text-brand-navy px-3 py-1 rounded-lg text-[10px] font-bold shadow-lg flex items-center gap-1">
                    🏷️ {session.price} د.ج
                  </div>
                ) : (
                  <div className="bg-brand-green text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-lg">
                    🎁 مجاني
                  </div>
                )}
              </div>

              {session.status === 'live' && (
                <div className="absolute bottom-4 right-4 text-white text-[10px] font-bold flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  {session.viewers} مشاهد
                </div>
              )}
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold mb-4 line-clamp-1">{session.title}</h3>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-brand-green" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{session.teacher}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{session.time || 'موعد غير محدد'}</span>
                </div>
              </div>
              
              <Link 
                to={session.status === 'live' ? `/live/${session.id}` : '#'}
                className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  session.status === 'live' 
                    ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20 hover:bg-brand-green/90' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {session.status === 'live' ? (
                  <>
                    <Zap className="w-4 h-4" />
                    انضم للبث الآن
                  </>
                ) : (
                  'انتظر موعد البث'
                )}
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      {/* النافذة الخاصة بالأستاذ لإنشاء بث جديد وضبط السعر */}
      <AnimatePresence>
        {showNewLiveModal && profile?.role === 'teacher' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewLiveModal(false)}
              className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand-navy/5">
                <h3 className="text-xl font-bold text-brand-navy flex items-center gap-2">
                  <Video className="w-6 h-6 text-brand-green" />
                  إنشاء بث مباشر جديد
                </h3>
                <button onClick={() => setShowNewLiveModal(false)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm bg-gray-50">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateLiveStream} className="p-6 flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">عنوان الحصة</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="مثال: مراجعة نهائية في مادة العلوم"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">المادة المدرسية</label>
                  <input 
                    type="text" 
                    required
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    placeholder="مثال: علوم الطبيعة والحياة"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                      <Timer className="w-4 h-4 text-brand-green" /> مدة البث (دقيقة)
                    </label>
                    <select 
                      value={formData.duration}
                      onChange={e => setFormData({...formData, duration: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-green outline-none"
                    >
                      <option value="30">30 دقيقة</option>
                      <option value="60">60 دقيقة</option>
                      <option value="90">90 دقيقة</option>
                      <option value="120">120 دقيقة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                      <Users className="w-4 h-4 text-brand-green" /> أقصى عدد حضور
                    </label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      max="500"
                      value={formData.maxAttendees}
                      onChange={e => setFormData({...formData, maxAttendees: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-green outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 italic">توقيت البدء</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={formData.time}
                      onChange={e => setFormData({...formData, time: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-green outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-gold mb-2 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> سعر التلميذ (د.ج)
                    </label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      placeholder="0 = مجاني"
                      className="w-full bg-brand-gold/5 border-2 border-brand-gold/30 text-brand-navy rounded-xl px-4 py-3 text-sm focus:border-brand-gold outline-none font-bold"
                    />
                  </div>
                </div>

                {/* شرح التكلفة على الأستاذ */}
                <div className="bg-brand-navy/5 p-4 rounded-2xl border border-brand-navy/10">
                  <p className="text-[10px] text-gray-500 mb-2 font-bold uppercase tracking-wider">تقدير تكلفة Agora (على الأستاذ):</p>
                  <div className="flex justify-between items-center text-brand-navy">
                    <span className="text-xs">تكلفة البث المقدرة:</span>
                    <span className="font-black text-lg">
                      {Math.ceil((Number(formData.duration)/60) * (Number(formData.maxAttendees)/50) * 100)} د.ج
                    </span>
                  </div>
                </div>

                {/* شرح ذكي حسب اختيار السعر */}
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  {Number(formData.price) === 0 ? (
                    <div className="bg-brand-green/10 text-brand-green border border-brand-green/20 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                      البث الخاص بك سيكون مجانياً ومتاحاً لجميع الطلاب في المنصة.
                    </div>
                  ) : Number(formData.price) > 0 ? (
                    <div className="bg-brand-gold/10 text-brand-navy border border-brand-gold/20 p-3 rounded-xl text-xs font-bold leading-relaxed">
                      💡 سيحتاج التلاميذ لشراء تذكرة دخول لهذه الحصة بقيمة <strong className="text-brand-gold">{formData.price} د.ج</strong> خصماً من محفظتهم.
                    </div>
                  ) : null}
                </motion.div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    className="bg-brand-green text-white w-full py-4 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Video className="w-5 h-5" />
                    نشر البث وإضافته لجدول الحصص
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LiveLessons;
