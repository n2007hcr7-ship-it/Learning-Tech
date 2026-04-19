import { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, VideoOff, MessageCircle, Users, Zap, Disc, Send, Loader2, Play, Timer, CreditCard } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useAuth } from '../App';
import { toast } from 'sonner';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';

// ── Agora Constants ──────────────────────────────────────────
const AGORA_APP_ID = "d470a3d136d740b585a7254a5a20c5b1";

const LiveRoom = () => {
  const { id: roomId = 'default_live_room' } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [hasAccess, setHasAccess] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [agoraLoading, setAgoraLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [hasPaidStream, setHasPaidStream] = useState(false);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [isBlackScreen, setIsBlackScreen] = useState(false);
  const autoStartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const isUploadingRef = useRef(false);

  useEffect(() => {
    if (profile?.role === 'student') {
      const handleVisibility = () => {
        setIsBlackScreen(document.hidden);
        if (document.hidden) {
          toast.warning('لا يُسمح بتسجيل الشاشة! يرجى العودة لتبويب الدرس.');
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
    }
  }, [profile]);

  useEffect(() => {
    return () => {
      if (autoStartTimerRef.current) clearTimeout(autoStartTimerRef.current);
    };
  }, []);

  // ── Session State Logic ──────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    const fetchSession = async () => {
      const { data } = await supabase.from('live_streams').select('*').eq('id', roomId).single();
      if (data) setSession(data);
    };
    fetchSession();
    const channel = supabase.channel(`live_stream_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams', filter: `id=eq.${roomId}` }, () => {
        fetchSession();
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); }
  }, [roomId]);

  const handlePayStream = async () => {
    if (profile?.role !== 'teacher' || !session) return;
    try {
      setProcessingPayment(true);
      
      const { data: rpcData, error: rpcError } = await supabase.rpc('pay_for_agora_stream', { 
        p_room_id: roomId, 
        p_duration: session.duration || 60, 
        p_max_attendees: session.maxAttendees || 50 
      });
      if (rpcError) throw rpcError;
      
      setHasPaidStream(true);
      toast.success('تم دفع تكاليف البث بنجاح! يمكنك الآن تفعيل البدء التلقائي.');
    } catch (e: any) {
      console.error(e);
      const msg = e.message?.includes('resource-exhausted') 
        ? 'رصيدك غير كافٍ لتغطية تكاليف هذا البث.' 
        : 'فشل عملية الدفع، يرجى المحاولة لاحقاً.';
      toast.error(msg);
      if (e.message?.includes('resource-exhausted')) {
        navigate('/payments');
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleAutoStart = () => {
    if (!session?.time) {
      toast.error('لم يتم تحديد وقت للبث!');
      return;
    }
    
    const startTimeStamp = new Date(session.time).getTime();
    const nowStamp = new Date().getTime();
    const delay = startTimeStamp - nowStamp;
    
    if (delay <= 0) {
      initAgora();
    } else {
      setAutoStartEnabled(true);
      toast.success(`تم تفعيل البدء التلقائي! سيبدأ البث خلال ${Math.ceil(delay / 60000)} دقيقة.`);
      autoStartTimerRef.current = setTimeout(() => {
        initAgora();
        setAutoStartEnabled(false);
      }, delay);
    }
  };

  const handleUploadRecord = async (blob: Blob) => {
    if (isUploadingRef.current) return;
    isUploadingRef.current = true;
    toast.info('جاري معالجة وتسجيل الحصة المعروضة...', { duration: 10000 });
    
    try {
      const fileName = `live_${roomId}_${Date.now()}.webm`;
      const { data, error } = await supabase.storage.from('lessons_videos').upload(fileName, blob, { contentType: 'video/webm' });
      
      if (error) {
        throw error;
      }
      
      const { data: urlData } = supabase.storage.from('lessons_videos').getPublicUrl(fileName);
      
      await supabase.from('lessons').insert({
         title: session.title + ' (تسجيل البث المباشر)',
         description: `تسجيل حصة البث المباشر. السعر: ${session.price} د.ج`,
         subject: session.subject,
         month: session.month || 'عام',
         level: session.level || 'جميع المستويات',
         videoUrl: urlData.publicUrl,
         thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b', // Education default
         teacherId: user?.id,
         teacherName: profile?.name || 'أستاذ',
         views: 0
      });
      
      toast.success('تم حفظ الحصة ونشرها بنجاح!');
    } catch(err) {
      console.error(err);
      toast.error('لم يتم حفظ تسجيل الحصة.');
    } finally {
      isUploadingRef.current = false;
    }
  };

  // ── Agora State ──────────────────────────────────────────────
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const videoRef = useRef<HTMLDivElement>(null);

  // ── Access Check ─────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    if (profile.role === 'teacher' || profile.isSubscribed || (profile?.unlockedLiveStreams || []).includes(roomId)) {
      setHasAccess(true);
    }
  }, [profile, roomId]);

  // ── Payment Handler ─────────────────────────────────────────
  const livePrice = session?.price || 0;

  const handlePayEntry = async () => {
    if (!user || !profile) return;
    if ((profile?.balance || 0) < livePrice) {
      toast.error(`رصيد محفظتك غير كافٍ. تحتاج إلى ${livePrice} دج لدخول البث.`);
      return;
    }
    setProcessingPayment(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('process_service_payment', { 
        p_amount: livePrice, 
        p_reason: 'live_stream', 
        p_teacher_id: session?.teacherId || session?.teacher_id 
      });
      if (rpcError) throw rpcError;
      
      const { data: userData } = await supabase.from('users').select('unlocked_live_streams').eq('id', user.id).single();
      const unlockedLiveStreams = userData?.unlocked_live_streams || [];
      if (!unlockedLiveStreams.includes(roomId)) {
        await supabase.from('users').update({ unlocked_live_streams: [...unlockedLiveStreams, roomId] }).eq('id', user.id);
      }
      
      toast.success(`تم خصم ${livePrice} دج بنجاح، جاري الدخول...`);
      setHasAccess(true);
    } catch (error: any) {
      toast.error('فشل معالجة الدفع');
    } finally {
      setProcessingPayment(false);
    }
  };

  // ── Agora Logic ─────────────────────────────────────────────
  const initAgora = async () => {
    if (!user || client) return;
    
    let agoraClient: IAgoraRTCClient;
    try {
      setAgoraLoading(true);
      agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      setClient(agoraClient);

      // 1. الحصول على التوكن من الخادم (Edge Function)
      const uid = Math.floor(Math.random() * 1000000); // معرف رقمي لـ Agora
      const { data, error } = await supabase.functions.invoke('get-agora-token', {
        body: { channelName: roomId, uid }
      });
      if (error) throw error;

      // 2. الانضمام للقناة
      await agoraClient.join(AGORA_APP_ID, roomId, data.token, uid);

      // 3. إذا كان أستاذاً: تشغيل وبث الكاميرا/الميكروفون وتسجيلها
      if (profile?.role === 'teacher') {
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        if (videoRef.current) {
          videoTrack.play(videoRef.current);
        }
        
        await agoraClient.publish([audioTrack, videoTrack]);
        
        try {
          const mediaStream = new MediaStream([
            videoTrack.getMediaStreamTrack(),
            audioTrack.getMediaStreamTrack()
          ]);
          const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
          
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
          };
          
          recorder.onstop = () => {
             const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
             recordedChunksRef.current = [];
             handleUploadRecord(blob);
          };
          
          mediaRecorderRef.current = recorder;
          recorder.start();
          setIsRecording(true);
        } catch(e) {
          console.error('Failed to start MediaRecorder:', e);
        }
      }

      // 4. معالجة المستخدمين الآخرين
      agoraClient.on("user-published", async (remoteUser, mediaType) => {
        await agoraClient.subscribe(remoteUser, mediaType);
        if (mediaType === "video") {
          setRemoteUsers(prev => [...prev.filter(u => u.uid !== remoteUser.uid), remoteUser]);
        }
        if (mediaType === "audio") {
          remoteUser.audioTrack?.play();
        }
      });

      agoraClient.on("user-published", (remoteUser, mediaType) => {
        if (mediaType === "video") {
          // Play remote video
        }
      });

      agoraClient.on("user-unpublished", (remoteUser) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
      });

    } catch (error) {
      console.error("Agora Init Error:", error);
      toast.error("فشل الاتصال بخادم البث المباشر.");
    } finally {
      setAgoraLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAccess || !user) return;

    // بالنسبة للتلاميذ: ينضمون تلقائياً إذا كان البث مباشراً ومتاحاً
    const changeViewersCount = async (delta: number) => {
      const { data } = await supabase.from('live_streams').select('viewers').eq('id', roomId).single();
      if (data) {
        await supabase.from('live_streams').update({ viewers: Math.max(0, data.viewers + delta) }).eq('id', roomId);
      }
    };

    if (profile?.role === 'student' && session?.status === 'live') {
      const currentViewers = session.viewers || 0;
      const maxAttendees   = session.maxAttendees || session.max_attendees || 50;

      if (currentViewers < maxAttendees) {
        initAgora();
        // زيادة عدد المشاهدين
        changeViewersCount(1);
      }
    }

    return () => {
      // تنظيف الموارد عند مغادرة الغرفة
      if (profile?.role === 'student' && session?.status === 'live') {
        changeViewersCount(-1);
      }
      localAudioTrack?.stop();
      localAudioTrack?.close();
      localVideoTrack?.stop();
      localVideoTrack?.close();
      client?.leave();
    };
  }, [hasAccess, session?.status]);

  // ── Toggle Media ────────────────────────────────────────────
  const toggleMute = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  // ── Chat Logic ──────────────────────────────────────────────
  const [message, setMessage]   = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from('live_comments').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(100);
      if (data) {
        setMessages(data.map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          userName: msg.user_name || msg.userName,
          role: msg.role,
          createdAt: msg.created_at || msg.createdAt
        })));
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };
    fetchMessages();
    const commentChannel = supabase.channel(`live_comments_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_comments', filter: `room_id=eq.${roomId}` }, () => {
        fetchMessages();
      }).subscribe();

    return () => { supabase.removeChannel(commentChannel); }
  }, [roomId]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return;
    await supabase.from('live_comments').insert({
      room_id: roomId,
      text: message,
      user_id: user.id,
      user_name: profile?.name || user.email || 'تلميذ',
      role: profile?.role || 'student',
      created_at: new Date().toISOString()
    });
    setMessage('');
  };

  if (!hasAccess && profile?.role !== 'teacher') {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[40px] p-8 max-w-md w-full text-center shadow-2xl">
          <CreditCard className="w-16 h-16 text-brand-green mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4 text-brand-navy">الدخول للبث المباشر</h2>
          <p className="text-gray-500 mb-8">تحتاج إلى {livePrice} دج من رصيد محفظتك لمشاهدة هذا البث.</p>
          <button 
            onClick={handlePayEntry}
            disabled={processingPayment || (profile?.balance || 0) < livePrice}
            className="w-full py-4 rounded-2xl bg-brand-navy text-white font-bold disabled:bg-gray-200"
          >
            {processingPayment ? 'جاري المعالجة...' : `دفع ${livePrice} دج والدخول`}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* منطقة البث (70%) */}
        <div className="lg:col-span-7 space-y-4 flex flex-col">
          <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
            
            {/* عرض فيديو الأستاذ للتلاميذ أو زر البدء للمعلم */}
            {profile?.role === 'teacher' && !client && (
              <div className="absolute inset-0 bg-brand-navy flex flex-col items-center justify-center text-white gap-6">
                <div className="w-24 h-24 bg-brand-green/10 rounded-[30px] flex items-center justify-center animate-pulse">
                  <Video className="w-12 h-12 text-brand-green" />
                </div>
                <div className="text-center px-6">
                  <h3 className="text-2xl font-bold mb-2">جاهز لبدء بـثك المباشر؟</h3>
                  <div className="flex justify-center gap-4 mb-6">
                    <div className="bg-white/10 px-3 py-2 rounded-xl border border-white/5">
                      <p className="text-[10px] text-gray-400 uppercase font-black">المدة</p>
                      <p className="text-sm font-bold text-brand-green text-center">{session?.duration || 60} د</p>
                    </div>
                    <div className="bg-white/10 px-3 py-2 rounded-xl border border-white/5">
                      <p className="text-[10px] text-gray-400 uppercase font-black">العدد الأقصى</p>
                      <p className="text-sm font-bold text-brand-green text-center">{session?.maxAttendees || 50} طالب</p>
                    </div>
                  </div>
                  
                  <div className="bg-brand-gold/20 border border-brand-gold/30 p-4 rounded-2xl mb-6">
                    <p className="text-xs text-brand-gold font-bold mb-1">تكلفة فتح موارد البث المباشر:</p>
                    <p className="text-2xl font-black text-white">
                      {Math.ceil((Number(session?.duration || 60)/60) * (Number(session?.maxAttendees || 50)/50) * 100)} د.ج
                    </p>
                    <p className="text-[9px] text-gray-400 mt-1">* سيتم خصمها من رصيدك عند البدء</p>
                  </div>

                  {hasPaidStream ? (
                    <button 
                      onClick={handleAutoStart}
                      disabled={autoStartEnabled || agoraLoading}
                      className={`text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl flex items-center justify-center gap-3 w-full ${
                        autoStartEnabled ? 'bg-orange-500 hover:bg-orange-600' : 'bg-brand-green hover:bg-brand-green/90 shadow-brand-green/20 active:scale-95'
                      }`}
                    >
                      {autoStartEnabled ? <Timer className="w-6 h-6 animate-pulse" /> : <Play className="w-6 h-6 fill-current" />}
                      {autoStartEnabled ? 'البدء التلقائي مفعل (في الانتظار)' : 'تفعيل البدء التلقائي'}
                    </button>
                  ) : (
                    <button 
                      onClick={handlePayStream}
                      disabled={processingPayment}
                      className="bg-brand-gold text-brand-navy px-10 py-4 rounded-2xl font-bold text-lg hover:bg-brand-gold/90 transition-all shadow-xl shadow-brand-gold/20 flex items-center gap-3 active:scale-95 w-full justify-center"
                    >
                      {processingPayment ? <Loader2 className="w-6 h-6 animate-spin" /> : <CreditCard className="w-6 h-6" />}
                      دفع تكاليف البث
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* شاشة القاعة ممتلئة للتلميذ */}
            {profile?.role === 'student' && !client && session?.status === 'live' && (session.viewers || 0) >= (session.maxAttendees || 50) && (
              <div className="absolute inset-0 bg-brand-navy flex flex-col items-center justify-center text-white gap-4 p-8 text-center">
                <Users className="w-16 h-16 text-red-500 mb-2" />
                <h3 className="text-xl font-bold">عذراً.. القاعة ممتلئة!</h3>
                <p className="text-sm text-gray-400">لقد وصل البث المباشر للحد الأقصى من الحضور ({session.maxAttendees} طالب) الذي حدده الأستاذ.</p>
                <button onClick={() => navigate('/live')} className="text-brand-green text-sm font-bold underline mt-4">العودة للدروس</button>
              </div>
            )}

            {/* حجب الشاشة لمنع التصوير للتلميذ */}
            {isBlackScreen && profile?.role === 'student' && (
              <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-white">
                <VideoOff className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
                <h2 className="text-2xl font-bold mb-2">تسجيل الشاشة غير مسموح</h2>
                <p className="text-gray-400">يرجى العودة إلى التبويب لمواصلة المشاهدة بصورة طبيعية.</p>
              </div>
            )}

            <div ref={videoRef} className="w-full h-full" id="local-video" />
            
            {/* عرض فيديو الأستاذ للتلاميذ */}
            {profile?.role === 'student' && remoteUsers.length > 0 && (
              <div className="absolute inset-0">
                {remoteUsers.map(u => (
                  <RemoteVideo key={u.uid} user={u} />
                ))}
              </div>
            )}

            {/* حالة التحميل أو الانتظار */}
            {agoraLoading && (
              <div className="absolute inset-0 bg-brand-navy flex flex-col items-center justify-center text-white gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-brand-green" />
                <p className="font-bold">جاري الاتصال بغرفة البث...</p>
              </div>
            )}

            {!agoraLoading && profile?.role === 'student' && remoteUsers.length === 0 && session?.status === 'live' && (session.viewers || 0) < (session.maxAttendees || 50) && (
              <div className="absolute inset-0 bg-brand-navy/90 flex flex-col items-center justify-center text-white gap-4">
                <div className="p-6 bg-white/10 rounded-full animate-pulse">
                  <Play className="w-16 h-16 text-brand-gold" />
                </div>
                <h3 className="text-xl font-bold">بانتظار بدء الأستاذ للبث...</h3>
                <p className="text-gray-400 text-sm">سيظهر المعلم هنا تلقائياً فور بدئه</p>
              </div>
            )}

            {/* معلومات البث */}
            <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
              <div className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                مباشر
              </div>
              <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-2">
                <Users className="w-3 h-3 text-brand-green" />
                {session?.viewers || 0} / {session?.maxAttendees || 50}
              </div>
            </div>
          </div>

          {/* لوحة التحكم */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {profile?.role === 'teacher' && (
                <>
                  <button onClick={toggleMute} className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100'}`}>
                    {isMuted ? <MicOff /> : <Mic />}
                  </button>
                  <button onClick={toggleVideo} className={`p-4 rounded-2xl transition-all ${isVideoOff ? 'bg-red-100 text-red-600' : 'bg-gray-100'}`}>
                    {isVideoOff ? <VideoOff /> : <Video />}
                  </button>
                  <button onClick={() => setIsRecording(!isRecording)} className={`p-4 rounded-2xl transition-all flex items-center gap-2 font-bold ${isRecording ? 'bg-red-600 text-white' : 'bg-gray-100'}`}>
                    <Disc className={isRecording ? 'animate-pulse' : ''} />
                    <span>{isRecording ? 'تسجيل...' : 'بدء التسجيل'}</span>
                  </button>
                </>
              )}
            </div>
            <div className="text-center md:text-right">
              <h2 className="text-xl font-bold text-brand-navy">بث مباشر: جلسة تعليمية تفاعلية</h2>
              <p className="text-gray-500 text-sm">معرف الغرفة: {roomId}</p>
            </div>
            <button 
              onClick={() => {
                if (profile?.role === 'teacher' && mediaRecorderRef.current && isRecording) {
                  mediaRecorderRef.current.stop();
                }
                navigate('/live');
              }} 
              className="text-red-500 font-bold hover:underline"
            >
              مغادرة
            </button>
          </div>
        </div>

        {/* منطقة الدردشة (30%) */}
        <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[600px] lg:h-auto overflow-hidden">
          <div className="p-4 border-b font-bold flex items-center gap-2">
            <MessageCircle className="text-brand-green" /> الدردشة المباشرة
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`p-3 rounded-xl ${msg.role === 'teacher' ? 'bg-brand-green/10' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold">{msg.userName}</span>
                  <span className="text-[9px] text-gray-400">{msg.createdAt && new Date(msg.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm">{msg.text}</p>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="اسأل المعلم..." 
                className="flex-1 bg-gray-50 border rounded-2xl px-4 py-3 text-sm"
              />
              <button onClick={handleSendMessage} className="bg-brand-green text-white p-3 rounded-xl"><Send /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Remote Video Component ───────────────────────────────────
const RemoteVideo = ({ user }: { user: IAgoraRTCRemoteUser }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && user.videoTrack) {
      user.videoTrack.play(ref.current);
    }
  }, [user]);

  return <div ref={ref} className="w-full h-full" />;
};

export default LiveRoom;
