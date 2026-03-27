import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Award, PlayCircle, BookOpen, Clock, ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';

const LessonViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // منع دخول من لا يملك اشتراك (إلا إذا كان أستاذاً للمراجعة)
    if (profile?.role === 'student' && !profile?.isSubscribed) {
      toast.error('هذا المحتوى يتطلب باقة اشتراك (Premium) 🔒');
      navigate('/lessons');
      return;
    }

    const fetchLesson = async () => {
      try {
        if (!id) return;
        const lessonSnap = await getDoc(doc(db, 'lessons', id));
        if (lessonSnap.exists()) {
          setLesson({ id: lessonSnap.id, ...lessonSnap.data() });
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

    fetchLesson();
  }, [id, user, profile, navigate]);

  // دالة تُستدعى عند انتهاء التلميذ من مشاهدة الفيديو
  const handleVideoEnd = async () => {
    setIsVideoEnded(true);

    // الأستاذ لا يكسب نقاطاً من المشاهدة
    if (profile?.role !== 'student') return;

    try {
      // استدعاء دالة الخادم الآمنة بدلاً من الكتابة المباشرة
      const awardPoint = httpsCallable(functions, 'awardLessonPoint');
      const result: any = await awardPoint({ lessonId: lesson.id });

      if (result.data.success) {
        setShowConfetti(true);
        toast.success('أحسنت! 🥳 لقد ربحت +1 نقطة تعليمية (Credit Point) لإكمالك الدرس!', {
          duration: 5000,
          position: 'top-center',
          style: { background: '#22c55e', color: 'white', border: 'none' }
        });
        setTimeout(() => setShowConfetti(false), 6000);
      } else if (result.data.reason === 'already_completed') {
        toast.info('لقد أكملت هذا الدرس من قبل.', { position: 'top-center' });
      }
    } catch (error: any) {
      // Fallback: إذا فشل الاتصال بالخادم نُعلمه بالخطأ فقط
      console.error('Error calling awardLessonPoint:', error);
      toast.error('تعذّر الاتصال بالخادم. تأكد من اتصالك بالإنترنت.');
    }
  };

  // حماية الشاشة (Watermark)
  const watermarkText = user?.email || 'LEARNING-TECH';

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
            <div className="bg-brand-gold/10 text-brand-gold px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm shadow-inner">
              <Award className="w-4 h-4" />
              النقاط: {profile?.points || 0}
            </div>
          </div>
        </div>

        {/* Video Player Section */}
        <div className="bg-black/40 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl relative mb-8">
          
          {/* Watermark لمنع التسريب */}
          <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-10 mix-blend-overlay z-10 overflow-hidden">
             <div className="text-white text-5xl font-black rotate-45 tracking-widest uppercase">
               {watermarkText} - {watermarkText}
             </div>
          </div>

          <video 
            ref={videoRef}
            src={lesson.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4"} // فيديو افتراضي كعينة
            controls
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
            onEnded={handleVideoEnd}
            className="w-full aspect-video object-contain"
            poster={lesson.thumbnail}
          >
            متصفحك لا يدعم مشغل الفيديو.
          </video>

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
                <h3 className="font-bold text-lg mb-2 text-brand-green flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  تعلم واربح بذكاء!
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-4">
                  كيف يعمل نظام النقاط (Learn-to-Earn)؟
                  في كل مرة تكمل فيها مشاهدة فيديو لنهايته ستربح نقطة. يمكن استخدام هذه النقاط لحجز البث المباشر المأجور، والمحادثات الخاصة، والعديد من الخدمات الأخرى مجاناً من محفظتك.
                </p>
                <Link to="/profile" className="text-brand-green hover:underline text-xs font-bold">
                  اكتشف الهدايا المتاحة ←
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
