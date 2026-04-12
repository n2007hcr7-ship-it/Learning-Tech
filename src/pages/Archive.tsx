import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Download, 
  Play, 
  Trash2, 
  Lock, 
  Eye, 
  AlertCircle,
  FileVideo,
  Clock,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import { supabase } from '../supabase';

const Archive = () => {
  const { user, profile } = useAuth();
  const [savedLessons, setSavedLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedLessons = async () => {
      if (!user || (!profile?.downloaded_lessons?.length && !profile?.downloadedLessons?.length)) {
        setLoading(false);
        return;
      }

      try {
        const downloadedIds = profile.downloaded_lessons || profile.downloadedLessons || [];
        if (downloadedIds.length === 0) {
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.from('lessons').select('*').in('id', downloadedIds);
        if (data) {
          setSavedLessons(data);
        }
      } catch (error) {
        console.error('Error fetching saved lessons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedLessons();
  }, [user, profile]);

  const handlePlay = (title: string) => {
    toast.success(`جاري تشغيل: ${title}`, {
      description: 'المشاهدة محمية ضد تسجيل الشاشة.',
      icon: <ShieldCheck className="w-5 h-5 text-brand-green" />,
    });
  };

  const handleDelete = async (lessonId: string) => {
    if (!user) return;
    try {
      const currentLessons = profile?.downloaded_lessons || profile?.downloadedLessons || [];
      const updatedLessons = currentLessons.filter((id: string) => id !== lessonId);
      await supabase.from('users').update({ downloaded_lessons: updatedLessons }).eq('id', user.id);
      setSavedLessons(prev => prev.filter(l => l.id !== lessonId));
      toast.success('تم حذف الدرس من الأرشيف');
    } catch (error) {
      toast.error('فشل حذف الدرس');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-brand-green" />
            الأرشيف الشخصي
          </h1>
          <p className="text-gray-500">دروسك المحفوظة للمشاهدة في أي وقت بدون إنترنت</p>
        </div>
        <div className="bg-brand-gold/10 text-brand-gold p-4 rounded-3xl border border-brand-gold/20 flex items-center gap-3 max-w-sm">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <p className="text-[10px] font-bold leading-tight">
            تنبيه: لا يسمح التطبيق بتسجيل الشاشة. سيتم حظر الحساب تلقائياً في حال رصد أي محاولة لتسجيل المحتوى.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Saved Lessons List */}
        <div className="lg:col-span-2 space-y-6">
          {savedLessons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {savedLessons.map((lesson, i) => (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group relative overflow-hidden"
                >
                  {/* Anti-Record Watermark (Simulated) */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.02] flex items-center justify-center select-none overflow-hidden">
                    <div className="rotate-45 text-brand-navy text-6xl font-bold whitespace-nowrap">
                      LEARNING TECH - {lesson.id}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-brand-green/10 flex items-center justify-center">
                      <FileVideo className="w-7 h-7 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-navy line-clamp-1">{lesson.title}</h3>
                      <p className="text-xs text-gray-500">{lesson.teacher}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 text-[10px] text-gray-500 font-bold">
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl">
                      <Clock className="w-3 h-3" />
                      <span>{lesson.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl">
                      <Download className="w-3 h-3" />
                      <span>{lesson.size}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handlePlay(lesson.title)}
                      className="flex-1 bg-brand-green text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/20"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      مشاهدة الآن
                    </button>
                    <button 
                      onClick={() => handleDelete(lesson.id)}
                      className="p-3 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-gray-200 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6">
                <Download className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-400 mb-2">لا توجد دروس محفوظة</h3>
              <p className="text-gray-400 text-sm">قم بتحميل الدروس من صفحة الدروس أو اللايف لمشاهدتها هنا</p>
            </div>
          )}
        </div>

        {/* Security Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-brand-navy p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/20 rounded-full -mr-16 -mt-16 blur-3xl" />
            <ShieldCheck className="w-12 h-12 text-brand-green mb-6" />
            <h3 className="text-xl font-bold mb-4">حماية المحتوى</h3>
            <ul className="space-y-4 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 flex-shrink-0" />
                <span>يتم تشفير جميع الفيديوهات المحملة ولا يمكن تشغيلها خارج التطبيق.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 flex-shrink-0" />
                <span>رصد تلقائي لبرامج تسجيل الشاشة وحجب المحتوى فوراً.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 flex-shrink-0" />
                <span>علامة مائية ديناميكية تحتوي على بيانات المستخدم لمنع التسريب.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-gold" />
              مساحة التخزين
            </h3>
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-2">
              <div className="bg-brand-green h-full w-[45%]" />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-gray-500">
              <span>770 MB مستخدم</span>
              <span>2 GB متاح</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Archive;
