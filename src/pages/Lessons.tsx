import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { BookOpen, User, Lock, Download, ShieldAlert, PlayCircle, ShieldCheck, Plus, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import * as tus from 'tus-js-client';

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
    level: '',
    price: 0,
    type: 'video' as 'video' | 'playlist'
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const uploadToBunny = async (file: File, title: string) => {
    const API_KEY = import.meta.env.VITE_BUNNY_API_KEY;
    const LIBRARY_ID = import.meta.env.VITE_BUNNY_LIBRARY_ID;

    const createRes = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`, {
      method: "POST",
      headers: {
        "AccessKey": API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ title })
    });
    
    const createData = await createRes.json();
    if (!createRes.ok || !createData) throw new Error("فشل تحضير مفاتيح الرفع");

    const videoId = createData.guid;
    const expirationTime = Math.floor(Date.now() / 1000) + (12 * 3600);
    const signatureString = `${LIBRARY_ID}${API_KEY}${expirationTime}${videoId}`;
    
    const msgBuffer = new TextEncoder().encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: "https://video.bunnycdn.com/tusupload",
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          "AuthorizationSignature": signature,
          "AuthorizationExpire": String(expirationTime),
          "VideoId": videoId,
          "LibraryId": LIBRARY_ID,
        },
        metadata: {
          filetype: file.type,
          title: title,
        },
        onError: (error) => reject(error),
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(0);
          setUploadProgress(Number(percentage));
        },
        onSuccess: () => resolve()
      });
      upload.start();
    });

    return {
      videoId,
      url: `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}`,
      title
    };
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || profile.role !== 'teacher') return;
    
    if (lessonForm.type === 'video' && !videoFile) {
      setToastMessage({ text: 'الرجاء اختيار ملف فيديو!', type: 'error' });
      return;
    }
    if (lessonForm.type === 'playlist' && playlistVideos.length === 0) {
      setToastMessage({ text: 'الرجاء إضافة فيديوهات للقائمة!', type: 'error' });
      return;
    }
    if (!thumbnailFile) {
      setToastMessage({ text: 'الرجاء اختيار صورة مصغرة!', type: 'error' });
      return;
    }

    try {
      setIsUploading(true);
      setToastMessage({ text: 'جاري البدء في الرفع عملية قد تستغرق وقتاً... ⏳', type: 'success' });
      
      // 1. Thumbnail
      const fileExtThumb = thumbnailFile.name.split('.').pop();
      const fileNameThumb = `thumb_${Date.now()}.${fileExtThumb}`;
      const { data: thumbData, error: thumbError } = await supabase.storage
        .from('lessons_thumbnails')
        .upload(fileNameThumb, thumbnailFile);
      if (thumbError) throw thumbError;
      const { data: thumbUrlData } = supabase.storage.from('lessons_thumbnails').getPublicUrl(fileNameThumb);

      let finalVideos = [];
      let mainVideoUrl = '';

      if (lessonForm.type === 'video' && videoFile) {
        const uploaded = await uploadToBunny(videoFile, lessonForm.title);
        mainVideoUrl = uploaded.url;
        finalVideos = [uploaded];
      } else {
        // Playlist logic: sequential upload of files already in playlistVideos
        for (let i = 0; i < playlistVideos.length; i++) {
          const v = playlistVideos[i];
          setToastMessage({ text: `جاري رفع الفيديو ${i + 1} من ${playlistVideos.length}... 🚀`, type: 'success' });
          const uploaded = await uploadToBunny(v.file, v.title);
          finalVideos.push(uploaded);
          if (i === 0) mainVideoUrl = uploaded.url;
        }
      }

      await supabase.from('lessons').insert({
        ...lessonForm,
        thumbnail: thumbUrlData.publicUrl,
        videoUrl: mainVideoUrl,
        videos: finalVideos,
        teacherId: user?.id,
        teacherName: profile.name || 'أستاذ',
        createdAt: new Date().toISOString(),
        views: 0
      });
      
      setShowAddModal(false);
      setToastMessage({ text: 'تم نشر الكورس بنجاح! 🎉', type: 'success' });
      setLessonForm({title: '', description: '', subject: '', level: '', price: 0, type: 'video'});
      setVideoFile(null);
      setThumbnailFile(null);
      setPlaylistVideos([]);
      setUploadProgress(0);
    } catch (err) {
      console.error(err);
      setToastMessage({ text: 'حدث خطأ أثناء الرفع!', type: 'error' });
    } finally {
      setIsUploading(false);
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
  const handlePurchaseLesson = async (lesson: any) => {
    if (!profile || profile.role !== 'student') return;
    if (lesson.price === 0) return;

    if (profile.balance < lesson.price) {
      setToastMessage({ text: 'عذراً، رصيدك غير كافٍ! يرجى شحن المحفظة.', type: 'error' });
      return;
    }

    try {
      setToastMessage({ text: 'جاري إتمام عملية الشراء... 💳', type: 'success' });
      
      // Use existing process_service_payment RPC
      const { data, error } = await supabase.rpc('process_service_payment', {
        p_student_id: user?.id,
        p_teacher_id: lesson.teacherId,
        p_amount: lesson.price,
        p_reason: `شراء دورة: ${lesson.title}`
      });

      if (error) throw error;

      // Update unlocked_lessons array in users table
      const newUnlocked = [...(profile.unlocked_lessons || []), lesson.id];
      await supabase.from('users').update({ unlocked_lessons: newUnlocked }).eq('id', user?.id);
      
      setToastMessage({ text: 'تم فتح الدورة بنجاح! مشاهدة ممتعة 🎓', type: 'success' });
    } catch (err) {
      console.error(err);
      setToastMessage({ text: 'فشلت عملية الشراء!', type: 'error' });
    }
  };

  const handleWatch = (e: React.MouseEvent, lesson: any) => {
    const isUnlocked = profile?.unlocked_lessons?.includes(lesson.id) || profile?.role === 'teacher';
    const isFree = lesson.price === 0;

    if (!isUnlocked && !isFree) {
      e.preventDefault();
      setToastMessage({
        text: 'هذا المحتوى مدفوع! يرجى الضغط على زر "فتح الكورس" للشراء 🔒',
        type: 'error'
      });
      setTimeout(() => setToastMessage({ text: '', type: '' }), 4000);
    }
  };

  // دالة التحميل للمشاهدة بدون إنترنت (Offline)
  const handleDownload = (lesson: any) => {
    const isUnlocked = profile?.unlocked_lessons?.includes(lesson.id) || profile?.role === 'teacher';
    const isFree = lesson.price === 0;

    if (!isUnlocked && !isFree) {
      setToastMessage({ text: 'تحميل الدروس متاح فقط بعد الشراء 🔒', type: 'error' });
      return;
    }
    
    setToastMessage({ text: 'جاري تشفير الفيديو وتجهيزه للتحميل في وضع Offline... 📥', type: 'success' });
    setTimeout(() => setToastMessage({ text: '', type: '' }), 5000);
  };

  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(activeSearch.toLowerCase()) ||
    l.subject.toLowerCase().includes(activeSearch.toLowerCase()) ||
    l.teacherName.toLowerCase().includes(activeSearch.toLowerCase())
  );

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
            الدروس والدورات
          </h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-green" /> 
            محتوى آمن وحصري مخصص لطلاب المنصة
          </p>
        </div>
        <div className="flex gap-3">
          {profile?.role === 'teacher' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-brand-navy text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-brand-navy/90 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              إضافة كورس / قائمة
            </button>
          )}
          <div className="bg-brand-green/10 text-brand-green px-6 py-3 rounded-2xl font-bold shadow-inner flex items-center">
            {lessons.length} محتوى تعليمي
          </div>
        </div>
      </div>

      {/* 🔍 شريط البحث الذكي */}
      <div className="mb-12">
        <div className="relative max-w-2xl mx-auto group">
          <input 
            type="text" 
            placeholder="ابحث بموضوع الدرس، المادة، أو اسم الأستاذ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-2 border-gray-100 rounded-[30px] px-8 py-5 pr-14 font-bold text-lg shadow-sm focus:border-brand-green focus:shadow-xl transition-all outline-none"
          />
          <BookOpen className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300 group-focus-within:text-brand-green transition-colors" />
          <button 
            onClick={() => setActiveSearch(searchTerm)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-brand-navy text-white px-6 py-3 rounded-[20px] font-bold hover:bg-brand-navy/90 transition-all shadow-lg active:scale-95"
          >
            بحث
          </button>
        </div>
        {activeSearch && (
          <div className="flex justify-center mt-4">
            <button 
              onClick={() => { setSearchTerm(''); setActiveSearch(''); }}
              className="text-sm font-bold text-gray-400 hover:text-red-500 flex items-center gap-2"
            >
              إلغاء البحث عن: "{activeSearch}" <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {filteredLessons.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-brand-navy font-bold text-xl mb-2">لا توجد دروس حالياً</p>
          <p className="text-gray-500 text-sm">سيتم إضافة محتوى تعليمي قريباً جداً، ترقبوا!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredLessons.map((lesson, i) => {
            const isUnlocked = profile?.unlocked_lessons?.includes(lesson.id) || profile?.role === 'teacher';
            const isFree = lesson.price === 0;

            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-300 group flex flex-col"
              >
                <div className="relative aspect-video bg-black overflow-hidden">
                  <img 
                    src={lesson.thumbnail || `https://picsum.photos/seed/${lesson.id}/600/400`} 
                    alt={lesson.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
                    referrerPolicy="no-referrer"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="absolute top-4 left-4 flex gap-2">
                    <div className="bg-brand-green/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg">
                      {lesson.subject}
                    </div>
                    {lesson.type === 'playlist' && (
                      <div className="bg-brand-navy/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
                        <PlayCircle className="w-3 h-3" /> قائمة فيديوهات
                      </div>
                    )}
                  </div>

                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-brand-navy px-3 py-1 rounded-lg text-xs font-black shadow-lg">
                    {isFree ? 'مكافأة مجانية 🎁' : `${lesson.price} دج`}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="w-14 h-14 bg-brand-green/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all">
                      <PlayCircle className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-bold mb-3 text-brand-navy line-clamp-2 leading-snug hover:text-brand-green transition-colors cursor-pointer">
                    {lesson.title}
                  </h3>
                  <p className="text-gray-500 text-sm mb-6 line-clamp-2 leading-relaxed flex-1">
                    {lesson.description || 'لا يوجد وصف متاح لهذا الدرس'}
                  </p>
                  
                  <div className="pt-4 border-t border-gray-100 flex flex-col gap-4 mt-auto">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-400 font-bold uppercase">الأستاذ</span>
                          <span className="text-xs font-bold text-brand-navy">{lesson.teacherName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleDownload(lesson)}
                          className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-brand-navy hover:text-white transition-all"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {!isUnlocked && !isFree ? (
                      <button 
                        onClick={() => handlePurchaseLesson(lesson)}
                        className="w-full bg-brand-navy text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-navy/90 active:scale-95 transition-all shadow-lg"
                      >
                        <Lock className="w-4 h-4" /> فتح الكورس الآن
                      </button>
                    ) : (
                      <Link 
                        to={`/lesson/${lesson.id}`} 
                        className="w-full bg-brand-green text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-green/90 active:scale-95 transition-all shadow-lg shadow-brand-green/20"
                      >
                        <PlayCircle className="w-5 h-5" /> مشاهدة الآن
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
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
                <h3 className="text-xl font-bold flex items-center gap-2 text-brand-navy">
                  <Upload className="w-6 h-6 text-brand-green" />
                  إضافة دورة / محتوى تعليمي
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 max-h-[80vh] overflow-y-auto">
                <form onSubmit={handleAddLesson} className="space-y-6">
                  {/* نوع المحتوى */}
                  <div className="flex gap-4 p-1 bg-gray-100 rounded-2xl">
                    <button 
                      type="button"
                      onClick={() => setLessonForm({...lessonForm, type: 'video'})}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${lessonForm.type === 'video' ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-500'}`}
                    >
                      فيديو واحد
                    </button>
                    <button 
                      type="button"
                      onClick={() => setLessonForm({...lessonForm, type: 'playlist'})}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${lessonForm.type === 'playlist' ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-500'}`}
                    >
                      قائمة تشغيل
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">عنوان الدورة</label>
                      <input 
                        required
                        type="text" 
                        value={lessonForm.title}
                        onChange={(e) => setLessonForm({...lessonForm, title: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand-green outline-none"
                        placeholder="مثال: سلسلة الدوال الأسية"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">المادة</label>
                      <input 
                        required
                        type="text" 
                        value={lessonForm.subject}
                        onChange={(e) => setLessonForm({...lessonForm, subject: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">السعر (دج) - 0 للمجاني</label>
                      <input 
                        required
                        type="number"
                        min="0"
                        value={lessonForm.price}
                        onChange={(e) => setLessonForm({...lessonForm, price: Number(e.target.value)})}
                        className="w-full bg-brand-green/5 border border-brand-green/20 rounded-xl px-4 py-3 font-black text-brand-green focus:ring-2 focus:ring-brand-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">المستوى الدراسي</label>
                      <input 
                        required
                        type="text" 
                        value={lessonForm.level}
                        onChange={(e) => setLessonForm({...lessonForm, level: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand-green outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">الصورة المصغرة</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        required
                        onChange={(e) => e.target.files && setThumbnailFile(e.target.files[0])}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs"
                      />
                    </div>

                    {lessonForm.type === 'video' ? (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">ملف الفيديو</label>
                        <input 
                          type="file" 
                          accept="video/*"
                          required
                          onChange={(e) => e.target.files && setVideoFile(e.target.files[0])}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs"
                        />
                      </div>
                    ) : (
                      <div className="md:col-span-2 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <h4 className="font-bold text-brand-navy mb-4 flex items-center gap-2">
                          <PlayCircle className="w-5 h-5 text-brand-green" /> فيديوهات القائمة ({playlistVideos.length})
                        </h4>
                        
                        <div className="space-y-3 mb-4">
                          {playlistVideos.map((v, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between text-sm">
                              <span className="font-bold text-brand-navy line-clamp-1">{idx+1}. {v.title}</span>
                              <button 
                                type="button" 
                                onClick={() => setPlaylistVideos(playlistVideos.filter((_, i) => i !== idx))}
                                className="text-red-500 p-1 hover:bg-red-50 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col gap-3 p-4 bg-white rounded-2xl border border-dashed border-gray-200">
                          <input 
                            type="text" 
                            id="v_title"
                            placeholder="عنوان الفيديو الفرعي..."
                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 font-bold text-xs"
                          />
                          <input 
                            type="file" 
                            id="v_file"
                            accept="video/*"
                            className="text-xs"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const t = (document.getElementById('v_title') as HTMLInputElement).value;
                              const f = (document.getElementById('v_file') as HTMLInputElement).files?.[0];
                              if (t && f) {
                                setPlaylistVideos([...playlistVideos, { title: t, file: f }]);
                                (document.getElementById('v_title') as HTMLInputElement).value = '';
                                (document.getElementById('v_file') as HTMLInputElement).value = '';
                              }
                            }}
                            className="bg-brand-green text-white py-2 rounded-xl font-bold text-xs hover:opacity-90"
                          >
                            + إضافة للفائمة
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">وصف الدورة</label>
                      <textarea 
                        rows={3}
                        value={lessonForm.description}
                        onChange={(e) => setLessonForm({...lessonForm, description: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-green outline-none resize-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isUploading}
                    className={`w-full text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all text-lg flex items-center justify-center gap-2 ${
                      isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-navy hover:bg-brand-navy/90'
                    }`}
                  >
                    {isUploading ? `جاري الرفع... ${uploadProgress > 0 ? uploadProgress + '%' : 'تحضير'}` : 'نشر المحتوى 🚀'}
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
