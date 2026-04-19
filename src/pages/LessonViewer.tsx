import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Award, PlayCircle, Clock, ShieldCheck, User, Zap } from 'lucide-react';
import { toast } from 'sonner';

const LessonViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [iqCoins, setIqCoins] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastValidTimeRef = useRef(0);
  const seekingRef = useRef(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    
    const fetchLesson = async () => {
      try {
        if (!id) return;
        const { data, error } = await supabase.from('lessons').select('*').eq('id', id).single();
        if (data && !error) {
          setLesson(data);
        } else {
          toast.error('عذراً، هذا الدرس غير موجود أو تم حذفه');
          navigate('/lessons');
        }
      } catch (error) {
        console.error('Error fetching lesson:', error);
      } finally {
        setLoading(false);
      }
    };

    // جلب رصيد IQ Coins
    const fetchCoins = async () => {
      const { data } = await supabase.from('users').select('iq_coins').eq('id', user.id).single();
      if (data) setIqCoins(data.iq_coins || 0);
    };

    fetchLesson();
    fetchCoins();
  }, [id, user, navigate]);

  // ⚡ حماية ضد التخطي: نكتشف ما إذا قفز التلميذ أكثر من 10 ثوانٍ للأمام
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || seekingRef.current) return;
    const diff = video.currentTime - lastValidTimeRef.current;
    if (diff > 10) {
      // إعادة لآخر موضع مقبول
      video.currentTime = lastValidTimeRef.current;
      toast.error('⚠️ لا يُسمح بتخطي أجزاء الدرس! يجب المشاهدة الكاملة للحصول على IQ Coin.');
    } else {
      lastValidTimeRef.current = video.currentTime;
    }
  }, []);

  const handleSeeking = () => { seekingRef.current = true; };
  const handleSeeked = () => { seekingRef.current = false; };

  // 🔒 إخفاء الفيديو عند تبديل علامة التبويب (منع تصوير الشاشة)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsBlurred(document.hidden);
      if (document.hidden) {
        if (videoRef.current) videoRef.current.pause();
        if (profile?.role === 'student') {
          toast.error('⚠️ تحذير: لا يُسمح بتصوير الشاشة أو مغادرة هذه النافذة لحماية حقوق الملكية!', {
            duration: 6000,
            style: { background: '#ef4444', color: 'white', border: 'none', fontWeight: 'bold' }
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [profile]);

  // استماع لأحداث مشغل Bunny (Iframe)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const message = JSON.parse(e.data);
        if (message.event === 'ended') {
          handleVideoEnd();
        }
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [profile, user]);

  // دالة تُستدعى عند انتهاء التلميذ من مشاهدة الفيديو بالكامل
  const handleVideoEnd = async () => {
    setIsVideoEnded(true);
    if (profile?.role !== 'student') return;

    try {
      const { error } = await supabase.rpc('award_iq_coin', {
        lesson_id: lesson.id
      });

      if (!error) {
        setIqCoins(prev => prev + 1);
        setShowConfetti(true);
        toast.success('🥳 أحسنت! ربحت +1 IQ Coin على إكمالك هذا الدرس!', {
          duration: 5000,
          position: 'top-center',
          style: { background: '#22c55e', color: 'white', border: 'none' }
        });
        setTimeout(() => setShowConfetti(false), 6000);
      } else {
        toast.info('لقد أكملت هذا الدرس مسبقاً.');
      }
    } catch (error: any) {
      console.error('Error awarding IQ coin:', error);
    }
  };

  // حماية الشاشة (العلامة المائية)
  const watermarkText = profile?.name || user?.email || 'LEARNING-TECH';

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="min-h-screen bg-brand-navy text-white relative overflow-hidden pb-20">
      {/* عرض الاحتفال عند التخرج/النهاية */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          >
            <div className="text-9xl animate-bounce">🎇🎉🏆</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate('/lessons')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للدروس
          </button>
          
          <div className="flex items-center gap-4">
            <div className="bg-yellow-500/10 text-yellow-400 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm shadow-inner border border-yellow-500/20">
              <Zap className="w-4 h-4" />
              IQ Coins: {iqCoins}
            </div>
          </div>
        </div>

        {/* Video Player Section */}
        <div className="bg-black/40 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl relative mb-8">
          
          {/* 🔒 شاشة سوداء عند تبديل التبويب (منع تصوير الشاشة) */}
          {isBlurred && (
            <div className="absolute inset-0 bg-black z-30 flex flex-col items-center justify-center gap-4">
              <ShieldCheck className="w-16 h-16 text-green-400" />
              <p className="text-white font-bold text-xl">🔒 محتوى محمي</p>
              <p className="text-gray-400 text-sm">يُرجى العودة لهذه الصفحة لمواصلة المشاهدة</p>
            </div>
          )}

          {/* علامة مائية ديناميكية */}
          <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute text-white/5 font-black text-lg rotate-45 whitespace-nowrap"
                style={{ top: `${(i * 18) - 5}%`, left: `${i % 2 === 0 ? '-10%' : '10%'}` }}>
                {watermarkText} • LEARNING TECH •
              </div>
            ))}
          </div>

          {(lesson.url || lesson.videoUrl)?.includes("iframe.mediadelivery.net") ? (
            <iframe
              src={lesson.url || lesson.videoUrl}
              loading="lazy"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
              className="w-full aspect-video border-0 rounded-b-3xl"
            />
          ) : (
            <video 
              ref={videoRef}
              src={lesson.url || lesson.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4"}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              onEnded={handleVideoEnd}
              onTimeUpdate={handleTimeUpdate}
              onSeeking={handleSeeking}
              onSeeked={handleSeeked}
              className="w-full aspect-video object-contain bg-black rounded-b-3xl"
            >
              متصفحك لا يدعم مشغل الفيديو.
            </video>
          )}

          {isVideoEnded && profile?.role === 'student' && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-brand-green text-white px-8 py-4 rounded-2xl shadow-xl font-bold flex items-center gap-3 z-20"
            >
              <Award className="w-6 h-6" />
              تم إضافة 1 نقطة إلى محفظتك التعليمية بنجاح 🎁
            </motion.div>
          )}
        </div>

        {/* Lesson Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/5 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-brand-green text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-brand-green/20">
                  {lesson.subject}
                </span>
                <span className="flex items-center gap-1 text-gray-400 text-sm font-bold">
                  <Clock className="w-4 h-4" /> 
                  1 نقطة عند الإكمال
                </span>
              </div>
              
              <h1 className="text-3xl font-bold mb-4 leading-relaxed">{lesson.title}</h1>
              
              <p className="text-gray-300 leading-relaxed text-sm">
                {lesson.description || 'لا يوجد وصف متاح لهذا الدرس. سيقوم الأستاذ بإضافة الوصف المرفق لاحقاً.'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Teacher Info Card */}
            <div className="bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">مقدم الدرس</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-brand-gold to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-brand-navy" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{lesson.teacherName}</h4>
                  <div className="flex items-center gap-1 text-brand-gold text-xs font-bold mt-1">
                    <ShieldCheck className="w-4 h-4" />
                    أستاذ موثق
                  </div>
                </div>
              </div>
              <Link 
                to="/chats" 
                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              >
                تواصل مع الأستاذ (100 نقطة)
              </Link>
            </div>
            
            {/* Points System Info Banner */}
            <div className="bg-gradient-to-br from-brand-green/20 to-emerald-900/40 border border-brand-green/30 rounded-3xl p-6 relative overflow-hidden">
              <Award className="absolute -bottom-4 -right-4 w-32 h-32 text-brand-green/10" />
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-3 text-brand-green flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  تعلم واربح بذكاء!
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-4">
                  أكمل مشاهدة الدروس واكسب نقطة عند كل إتمام. استبدل نقاطك بخدمات مجانية:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-lg font-black">25</span>
                    <span>= دخول بث مباشر مجاني</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-lg font-black">100</span>
                    <span>= شات عادي مع أستاذ</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-lg font-black">30</span>
                    <span>= درس منفرد مجاني</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg font-black">80</span>
                    <span>= قائمة تشغيل كاملة</span>
                  </div>
                </div>
                <Link to="/points" className="text-brand-green hover:underline text-xs font-bold mt-4 block">
                  اكتشف محفظة النقاط ←
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LessonViewer;
