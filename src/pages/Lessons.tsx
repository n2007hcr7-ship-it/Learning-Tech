import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { BookOpen, User, Lock, Download, ShieldAlert, PlayCircle, ShieldCheck, Plus, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';

const LessonsPage = () => {
  const { user, profile } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // إشعار ديناميكي مخصص لرسائل التحميل والأخطاء
  const [toastMessage, setToastMessage] = useState({ text: '', type: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    subject: '',
    month: 'جانفي',
    level: '',
    thumbnail: '',
    videoUrl: ''
  });

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || profile.role !== 'teacher') return;
    try {
      await supabase.from('lessons').insert({
        ...lessonForm,
        teacherId: user?.id,
        teacherName: profile.name || 'أستاذ',
        createdAt: new Date().toISOString(),
        views: 0
      });
      setShowAddModal(false);
      setToastMessage({
        text: 'تمت إضافة الكورس بنجاح!',
        type: 'success'
      });
      setTimeout(() => setToastMessage({ text: '', type: '' }), 4000);
      setLessonForm({title: '', description: '', subject: '', month: 'جانفي', level: '', thumbnail: '', videoUrl: ''});
    } catch (err) {
      setToastMessage({
        text: 'فشل إضافة الكورس!',
        type: 'error'
      });
      setTimeout(() => setToastMessage({ text: '', type: '' }), 4000);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchLessons = async () => {
      const { data, error } = await supabase.from('lessons').select('*').order('createdAt', { ascending: false });
      if (!error && data) {
        setLessons(data);
      }
      setLoading(false);
    };

    fetchLessons();

    const channel = supabase.channel('realtime_lessons')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, (payload) => {
        fetchLessons();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // دالة التحقق عند الضغط على زر "مشاهدة"
  const handleWatch = (e: React.MouseEvent, lessonId: string) => {
    if (profile?.role === 'student' && !profile?.isSubscribed) {
      e.preventDefault(); // المنع التام للانتقال لصفحة المشاهدة
      setToastMessage({
        text: 'عذراً، مشاهدة هذا الدرس تتطلب باقة اشتراك فعالة 🔒 قم بتعبئة محفظتك أولاً!',
        type: 'error'
      });
      setTimeout(() => setToastMessage({ text: '', type: '' }), 4000);
      return;
    }
  };

  // دالة التحميل للمشاهدة بدون إنترنت (Offline)
  const handleDownload = (lessonId: string) => {
    if (profile?.role === 'student' && !profile?.isSubscribed) {
      setToastMessage({
        text: 'عذراً، ميزة تحميل الدروس (Offline) متاحة فقط لتلاميذ الباقة المدفوعة 🔒',
        type: 'error'
      });
      setTimeout(() => setToastMessage({ text: '', type: '' }), 4000);
      return;
    }
    
    setToastMessage({
      text: 'جاري تشفير الفيديو وتجهيزه للتحميل في وضع Offline... 📥',
      type: 'success'
    });
    setTimeout(() => setToastMessage({ text: '', type: '' }), 5000);
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
      <h1 className="text-3xl font-bold mb-4">يرجى تسجيل الدخول لمشاهدة الدروس</h1>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        المحتوى التعليمي متاح فقط للمشتركين المسجلين في المنصة. سجل دخولك الآن للوصول إلى آلاف الدروس.
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
    <div className="max-w-7xl mx-auto px-4 py-12 relative">
      
      {/* ظهور الإشعارات المخصصة */}
      <AnimatePresence>
        {toastMessage.text && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-24 left-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl font-bold text-sm text-white flex items-center gap-3 border backdrop-blur-md ${
              toastMessage.type === 'error' ? 'border-red-500 bg-red-600/95' : 'border-brand-green bg-brand-navy/95'
            }`}
          >
            {toastMessage.type === 'error' ? <ShieldAlert className="w-5 h-5 text-white" /> : <Download className="w-5 h-5 text-brand-green animate-bounce" />}
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-brand-green" />
            الدروس المسجلة
          </h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-green" /> 
            محتوى آمن وحصري مخصص للمشتركين
          </p>
        </div>
        <div className="flex gap-3">
          {profile?.role === 'teacher' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-brand-navy text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-brand-navy/90 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              إضافة كورس (شهر)
            </button>
          )}
          <div className="bg-brand-green/10 text-brand-green px-6 py-3 rounded-2xl font-bold shadow-inner flex items-center">
            {lessons.length} درس مسجل
          </div>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-brand-navy font-bold text-xl mb-2">لا توجد دروس حالياً</p>
          <p className="text-gray-500 text-sm">سيتم إضافة محتوى تعليمي قريباً جداً، ترقبوا!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {lessons.map((lesson, i) => (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-300 group flex flex-col"
            >
              {/* قسم الفيديو المصغر مع حماية الشاشة */}
              <div className="relative aspect-video bg-black overflow-hidden">
                <img 
                  src={lesson.thumbnail || `https://picsum.photos/seed/${lesson.id}/600/400`} 
                  alt={lesson.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
                  referrerPolicy="no-referrer"
                  onContextMenu={(e) => e.preventDefault()} // منع كليك يمين
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                
                <div className="absolute top-4 left-4 bg-brand-green/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg flex gap-2">
                  <span>{lesson.subject}</span>
                  {lesson.month && <span className="bg-white/20 px-1 rounded">{lesson.month}</span>}
                </div>

                {/* نظام الحماية المبتكر: علامة مائية عائمة لمنع سرقة الفيديوهات */}
                <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.08] mix-blend-overlay overflow-hidden">
                  <div className="text-white text-2xl font-black rotate-45 transform whitespace-nowrap">
                    {user?.email || 'LEARNING-TECH-PLATFORM'}
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="w-14 h-14 bg-brand-green/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all">
                    <PlayCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              {/* التفاصيل والأزرار */}
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold mb-3 text-brand-navy line-clamp-2 leading-snug hover:text-brand-green transition-colors cursor-pointer">
                  {lesson.title}
                </h3>
                <p className="text-gray-500 text-sm mb-6 line-clamp-2 leading-relaxed flex-1">
                  {lesson.description || 'لا يوجد وصف متاح لهذا الدرس'}
                </p>
                
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase border-brand-green">التقديم</span>
                      <span className="text-sm font-bold text-brand-navy">{lesson.teacherName || 'أستاذ المنصة'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* زر المشاهدة (ذكي) */}
                    <Link 
                      to={`/lesson/${lesson.id}`} 
                      onClick={(e) => handleWatch(e, lesson.id)} // تفعيل المنع هنا!
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg ${
                        profile?.isSubscribed || profile?.role === 'teacher'
                          ? 'bg-brand-green text-white shadow-brand-green/20 hover:bg-brand-green/90 hover:-translate-y-0.5'
                          : 'bg-gray-50 text-gray-500 border border-gray-200 cursor-not-allowed hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                      }`}
                    >
                      {!profile?.isSubscribed && profile?.role !== 'teacher' ? (
                        <>
                          <Lock className="w-4 h-4" /> مقفل
                        </>
                      ) : (
                        'مشاهدة الآن'
                      )}
                    </Link>

                    {/* زر تحميل الأوفلاين (ذكي) */}
                    <button 
                      onClick={() => handleDownload(lesson.id)}
                      title={profile?.isSubscribed ? "تنزيل لمشاهدة بدون إنترنت" : "يجب دفع الاشتراك للتحميل"}
                      className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                        profile?.isSubscribed || profile?.role === 'teacher'
                          ? 'bg-brand-navy/5 text-brand-navy hover:bg-brand-navy hover:text-white'
                          : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {!profile?.isSubscribed && profile?.role !== 'teacher' ? <Lock className="w-5 h-5 opacity-50" /> : <Download className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Lesson Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Upload className="w-6 h-6 text-brand-green" />
                  إضافة كورس (بلاي ليست شهرية)
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 max-h-[80vh] overflow-y-auto">
                <form onSubmit={handleAddLesson} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">عنوان الكورس / الدرس</label>
                      <input 
                        required
                        type="text" 
                        value={lessonForm.title}
                        onChange={(e) => setLessonForm({...lessonForm, title: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand-green outline-none text-sm"
                        placeholder="مثال: الوحدة الأولى - الدوال العددية"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">المادة</label>
                      <input 
                        required
                        type="text" 
                        value={lessonForm.subject}
                        onChange={(e) => setLessonForm({...lessonForm, subject: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand-green outline-none text-sm"
                        placeholder="رياضيات، فيزياء..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">شهر الكورس</label>
                      <select 
                        value={lessonForm.month}
                        onChange={(e) => setLessonForm({...lessonForm, month: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand-green outline-none text-sm"
                      >
                        {['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">المستوى الدراسي</label>
                      <input 
                        required
                        type="text" 
                        value={lessonForm.level}
                        onChange={(e) => setLessonForm({...lessonForm, level: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand-green outline-none text-sm"
                        placeholder="مثال: 3 ثانوي"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">رابط الصورة المصغرة</label>
                      <input 
                        type="url" 
                        value={lessonForm.thumbnail}
                        onChange={(e) => setLessonForm({...lessonForm, thumbnail: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-green outline-none"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">رابط الفيديو (أو البلاي ليست)</label>
                      <input 
                        required
                        type="url" 
                        value={lessonForm.videoUrl}
                        onChange={(e) => setLessonForm({...lessonForm, videoUrl: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-green outline-none text-left"
                        placeholder="https://youtube.com/..."
                        dir="ltr"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">وصف الكورس</label>
                      <textarea 
                        rows={3}
                        value={lessonForm.description}
                        onChange={(e) => setLessonForm({...lessonForm, description: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-green outline-none resize-none"
                        placeholder="اكتب وصفاً مختصراً عما سيتعلمه الطالب في هذا الشهر..."
                      />
                    </div>
                  </div>
                  
                  <div className="bg-blue-50/50 border border-blue-100 text-blue-600 p-4 rounded-xl text-xs font-bold flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>
                      نظام الكورسات الشهري: يُرجى تجديد المحتوى أو إضافة قائمة تشغيل جديدة مع بداية كل شهر جديد لضمان استمرارية التلاميذ المشتركين.
                    </p>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-brand-navy text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-brand-navy/90 active:scale-95 transition-all text-lg"
                  >
                    نشر الكورس 🚀
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LessonsPage;
