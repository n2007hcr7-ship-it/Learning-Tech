import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  BookOpen, 
  Video, 
  Plus, 
  TrendingUp, 
  MessageCircle, 
  Zap, 
  CheckCircle2, 
  Clock,
  Settings,
  MoreVertical,
  Bell,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  ChevronRight,
  Search,
  Filter,
  Download,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const TeacherDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [teacherData, setTeacherData] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonsCount, setLessonsCount] = useState(0);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [premiumMessages, setPremiumMessages] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'finances' | 'settings'>('overview');
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [realChartData, setRealChartData] = useState<any[]>([]);
  const [earningsSummary, setEarningsSummary] = useState({
    liveStreams: 0,
    normalChats: 0,
    premiumChats: 0,
    total: 0
  });

  const [pricingForm, setPricingForm] = useState({
    subscription: 0,
    normalChat: 300,
    premiumChat: 1000,
    liveStream: 500
  });

  const [workingHours, setWorkingHours] = useState({ start: '17:00', end: '23:00' });

  useEffect(() => {
    if (teacherData?.pricing) {
      setPricingForm({
        subscription: teacherData.pricing.subscription || 0,
        normalChat: teacherData.pricing.normalChat || 300,
        premiumChat: teacherData.pricing.premiumChat || 1000,
        liveStream: teacherData.pricing.liveStream || 500
      });
    }
    if (teacherData?.working_hours) {
      setWorkingHours(teacherData.working_hours);
    }
  }, [teacherData]);

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (pricingForm.normalChat < 300 || pricingForm.premiumChat < 1000 || pricingForm.liveStream < 500) {
        toast.error('الأسعار أقل من الحد الأدنى المسموح به (300 للعادي، 1000 للمميز، 500 للبث المباشر)!');
        return;
      }
      await supabase.from('teachers').update({ pricing: pricingForm }).eq('id', user.id);
      toast.success('تم حفظ تحديثات الأسعار بنجاح! 🚀');
    } catch (err) {
      console.error(err);
      toast.error('فشل حفظ الأسعار');
    }
  };

  const handleSaveWorkingHours = async () => {
    if (!user) return;
    try {
      await supabase.from('teachers').update({ working_hours: workingHours }).eq('id', user.id);
      toast.success('تم حفظ ساعات العمل بنجاح! ⏰');
    } catch (err) {
      toast.error('فشل حفظ ساعات العمل');
    }
  };

  const defaultChartData = [
    { name: 'السبت', earnings: 0, students: 0 },
    { name: 'الأحد', earnings: 0, students: 0 },
    { name: 'الاثنين', earnings: 0, students: 0 },
    { name: 'الثلاثاء', earnings: 0, students: 0 },
    { name: 'الأربعاء', earnings: 0, students: 0 },
    { name: 'الخميس', earnings: 0, students: 0 },
    { name: 'الجمعة', earnings: 0, students: 0 },
  ];

  // Helper to get last 7 days labels in Arabic
  const getDayLabel = (date: Date) => {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[date.getDay()];
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || profile?.role !== 'teacher') {
      navigate('/');
      toast.error('هذه الصفحة مخصصة للأساتذة فقط');
      return;
    }

    const fetchTeacher = async () => {
      const { data } = await supabase.from('teachers').select('*').eq('id', user.id).single();
      if (data) setTeacherData(data);
    };
    fetchTeacher();

    const channelTeacher = supabase.channel('realtime_teacher')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers', filter: `id=eq.${user.id}` }, (payload) => {
            fetchTeacher();
        })
        .subscribe();

    const fetchPremiumMessages = async () => {
        const { data } = await supabase.from('messages')
            .select('*')
            .eq('teacherId', user.id)
            .eq('isPremium', true)
            .order('createdAt', { ascending: false })
            .limit(10);
        if (data) setPremiumMessages(data);
    };
    fetchPremiumMessages();
    
    const channelMessages = supabase.channel('realtime_premium_messages_dash')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `teacherId=eq.${user.id}` }, (payload) => {
            fetchPremiumMessages();
        })
        .subscribe();

    const fetchData = async () => {
      try {
        const { data: lessonsSnap } = await supabase.from('lessons').select('*').eq('teacherId', user.id).order('createdAt', { ascending: false }).limit(5);
        if (lessonsSnap) setLessons(lessonsSnap);
        
        const { count: totalLessonsCount } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('teacherId', user.id);
        setLessonsCount(totalLessonsCount || 0);

        const { data: subsSnap } = await supabase.from('subscriptions').select('*').eq('teacherId', user.id);
        setSubscribersCount(subsSnap?.length || 0);

        const { data: transSnap } = await supabase.from('payments').select('*').eq('teacherId', user.id).order('createdAt', { ascending: false }).limit(5);
        if (transSnap) setTransactions(transSnap);
        
        const { data: allEarningsSnap } = await supabase.from('earnings').select('*').eq('teacherId', user.id).order('createdAt', { ascending: false });
        
        if (allEarningsSnap) {
           setTransactions(allEarningsSnap.slice(0, 10).map((doc: any) => ({ ...doc, type: 'earning' })));
        }

        const dailyData: { [key: string]: { earnings: number, students: number } } = {};
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('en-US');
          const label = getDayLabel(d);
          last7Days.push({ dateStr, label });
          dailyData[dateStr] = { earnings: 0, students: 0 };
        }

        let liveTotal = 0;
        let normalChatTotal = 0;
        let premiumChatTotal = 0;
        let totalEarnings = 0;

        (allEarningsSnap || []).forEach((data: any) => {
          const amount = data.earnedAmount || 0;
          totalEarnings += amount;

          if (data.reason === 'live_stream') liveTotal += amount;
          else if (data.reason === 'normal_chat') normalChatTotal += amount;
          else if (data.reason === 'premium_chat') premiumChatTotal += amount;

          if (data.createdAt) {
             const dateStr = new Date(data.createdAt).toLocaleDateString('en-US');
             if (dailyData[dateStr]) {
                 dailyData[dateStr].earnings += amount;
             }
          }
        });

        (subsSnap || []).forEach((data: any) => {
          if (data.createdAt) {
            const dateStr = new Date(data.createdAt).toLocaleDateString('en-US');
            if (dailyData[dateStr]) {
                dailyData[dateStr].students += 1;
            }
          }
        });

        setEarningsSummary({
          liveStreams: liveTotal,
          normalChats: normalChatTotal,
          premiumChats: premiumChatTotal,
          total: totalEarnings
        });

        const formattedChartData = last7Days.map(day => ({
          name: day.label,
          earnings: dailyData[day.dateStr].earnings,
          students: dailyData[day.dateStr].students
        }));
        setRealChartData(formattedChartData);

        if (subsSnap && subsSnap.length > 0) {
            const studentIds = subsSnap.map((sub: any) => sub.studentId);
            const { data: studentsList } = await supabase.from('users').select('*').in('id', studentIds);
            if (studentsList) {
                const combined = studentsList.map((stu: any) => {
                    const subInfo = subsSnap.find((s: any) => s.studentId === stu.id);
                    return { ...stu, joinedAt: subInfo?.createdAt };
                });
                setStudents(combined);
            }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      supabase.removeChannel(channelTeacher);
      supabase.removeChannel(channelMessages);
    };
  }, [user, profile, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || student.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const stats = [
    { title: 'إجمالي المشتركين', value: subscribersCount, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', trend: '+12%' },
    { title: 'الدروس المنشورة', value: lessonsCount, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-100', trend: '+2' },
    { title: 'ساعات البث', value: teacherData?.totalLiveHours || 0, icon: Video, color: 'text-red-600', bg: 'bg-red-100', trend: '0' },
    { title: 'الأرباح (دج)', value: teacherData?.balance || 0, icon: TrendingUp, color: 'text-brand-gold', bg: 'bg-brand-gold/10', trend: '+15%' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-100 mb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-navy flex items-center justify-center text-white shadow-xl">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-brand-navy">لوحة تحكم الأستاذ</h1>
                <p className="text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  آخر تحديث: {new Date().toLocaleTimeString('ar-DZ')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/lessons" className="bg-brand-navy text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-brand-navy/90 transition-all flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                إدارة الدروس
              </Link>
              <Link to="/live-lessons" className="bg-brand-orange text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-brand-orange/20 hover:bg-brand-orange/90 transition-all flex items-center gap-2">
                <Video className="w-5 h-5" />
                ابدأ بثاً مباشراً
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 mt-10 border-b border-gray-100">
            {[
              { id: 'overview', name: 'نظرة عامة', icon: BarChart3 },
              { id: 'students', name: 'طلابي', icon: Users },
              { id: 'finances', name: 'الأرباح والمالية', icon: Wallet },
              { id: 'settings', name: 'إعدادات التسعير', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 px-2 flex items-center gap-2 text-sm font-bold transition-all relative ${
                  activeTab === tab.id ? 'text-brand-green' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-brand-green rounded-full" 
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative group overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                      <stat.icon className="w-20 h-20" />
                    </div>
                    <div className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center mb-4`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <h3 className="text-gray-500 text-xs font-bold mb-1 uppercase tracking-wider">{stat.title}</h3>
                        <p className="text-3xl font-black text-brand-navy">{stat.value}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        stat.trend.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                      }`}>
                        {stat.trend}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h3 className="font-bold text-xl">نمو الأرباح والمشتركين</h3>
                        <p className="text-gray-400 text-sm">إحصائيات الأسبوع الأخير</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <div className="w-3 h-3 rounded-full bg-brand-green" />
                          الأرباح
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <div className="w-3 h-3 rounded-full bg-brand-gold" />
                          المشتركون
                        </div>
                      </div>
                    </div>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={realChartData.length > 0 ? realChartData : defaultChartData}>
                          <defs>
                            <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#9ca3af' }} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#9ca3af' }} 
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="earnings" 
                            stroke="#22c55e" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorEarnings)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Recent Lessons */}
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="font-bold text-lg">آخر الدروس المنشورة</h3>
                      <button 
                        onClick={() => navigate('/lessons')}
                        className="text-brand-green text-sm font-bold hover:underline"
                      >
                        عرض الكل
                      </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {lessons.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-20" />
                          <p>لم تقم بنشر أي دروس بعد</p>
                        </div>
                      ) : (
                        lessons.map((lesson) => (
                          <div key={lesson.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-12 bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                                <img 
                                  src={lesson.thumbnailUrl || `https://picsum.photos/seed/${lesson.id}/100/100`} 
                                  alt="Lesson" 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer" 
                                />
                              </div>
                              <div>
                                <h4 className="font-bold text-brand-navy">{lesson.title}</h4>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {lesson.views || 0} مشاهدة</span>
                                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-brand-green" /> {lesson.level}</span>
                                </div>
                              </div>
                            </div>
                            <button className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                              <MoreVertical className="w-5 h-5 text-gray-400" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                  {/* Premium Chat Notifications */}
                  <div className="bg-brand-navy text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-brand-gold/10 rounded-full blur-2xl" />
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2 relative z-10">
                      <Zap className="w-5 h-5 text-brand-gold" />
                      المحادثات المميزة
                    </h3>
                    <div className="space-y-4 relative z-10">
                      {premiumMessages.length === 0 ? (
                        <p className="text-center py-10 text-gray-400 text-sm">لا توجد رسائل جديدة</p>
                      ) : (
                        premiumMessages.slice(0, 3).map((msg, i) => (
                          <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex gap-3 hover:bg-white/10 transition-all cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-brand-gold flex items-center justify-center text-brand-navy font-bold shrink-0">
                              {msg.senderName?.[0] || '؟'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="text-sm font-bold truncate">{msg.senderName}</h4>
                                <span className="text-[10px] text-gray-400">
                                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('ar-DZ') : ''}
                                </span>
                              </div>
                              <p className="text-xs text-gray-300 truncate">{msg.text}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <Link 
                      to="/chats/premium"
                      className="w-full mt-6 py-3 rounded-2xl bg-brand-gold text-brand-navy font-bold text-sm hover:bg-white transition-all block text-center"
                    >
                      فتح جميع المحادثات
                    </Link>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-lg mb-6">إجراءات سريعة</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { name: 'الإعدادات', icon: Settings, color: 'bg-gray-100', tab: 'settings' },
                        { name: 'التقارير', icon: BarChart3, color: 'bg-blue-50', tab: 'finances' },
                        { name: 'الطلاب', icon: Users, color: 'bg-green-50', tab: 'students' },
                        { name: 'الدعم', icon: MessageCircle, color: 'bg-orange-50', action: () => navigate('/chats') },
                      ].map((action) => (
                        <button 
                          key={action.name} 
                          onClick={action.tab ? () => setActiveTab(action.tab as any) : action.action}
                          className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-gray-50 transition-all"
                        >
                          <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center`}>
                            <action.icon className="w-6 h-6 text-brand-navy" />
                          </div>
                          <span className="text-xs font-bold">{action.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'students' && (
            <motion.div
              key="students"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-brand-navy">قائمة المشتركين</h2>
                  <p className="text-gray-500 text-sm">لديك {students.length} تلميذ مشترك حالياً</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="بحث عن تلميذ..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 rounded-2xl border border-gray-100 focus:border-brand-green outline-none text-sm"
                    />
                  </div>
                  <select 
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all border-none outline-none text-sm font-bold"
                  >
                    <option value="all">كل المستويات</option>
                    <option value="1AS">1 ثانوي</option>
                    <option value="2AS">2 ثانوي</option>
                    <option value="3AS">3 ثانوي</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-8 py-4">التلميذ</th>
                      <th className="px-8 py-4">الولاية</th>
                      <th className="px-8 py-4">المستوى</th>
                      <th className="px-8 py-4">تاريخ الانضمام</th>
                      <th className="px-8 py-4">الحالة</th>
                      <th className="px-8 py-4">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center text-gray-400">
                          <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                          <p>لا يوجد تلاميذ يطابقون بحثك</p>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition-all group">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green font-bold">
                                {student.name?.[0] || 'ت'}
                              </div>
                              <div>
                                <p className="font-bold text-brand-navy">{student.name}</p>
                                <p className="text-xs text-gray-400">{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-sm text-gray-600">{student.wilaya || 'غير محدد'}</td>
                          <td className="px-8 py-4">
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">
                              {student.level || 'غير محدد'}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-sm text-gray-500">
                            {student.joinedAt ? new Date(student.joinedAt).toLocaleDateString('ar-DZ') : ''}
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-1.5 text-green-600 text-xs font-bold">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                              نشط
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <button className="p-2 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-all">
                              <MessageCircle className="w-4 h-4 text-brand-navy" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'finances' && (
            <motion.div
              key="finances"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Balance Card */}
                <div className="bg-brand-navy text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                      <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                        <Wallet className="w-6 h-6 text-brand-gold" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">الرصيد الحالي</p>
                        <h2 className="text-4xl font-black text-white">{teacherData?.balance || 0} <span className="text-lg font-bold text-brand-gold">دج</span></h2>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">أرباح هذا الشهر</span>
                        <span className="font-bold text-brand-green">+12,500 دج</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">إجمالي المسحوبات</span>
                        <span className="font-bold text-red-400">-5,000 دج</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="relative z-10 w-full py-4 bg-brand-gold text-brand-navy font-black rounded-2xl hover:bg-white transition-all shadow-xl shadow-brand-gold/20"
                  >
                    سحب الأرباح الآن
                  </button>
                </div>

                {/* Withdrawal Modal */}
                <AnimatePresence>
                  {isWithdrawModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl"
                      >
                        <h3 className="text-2xl font-black text-brand-navy mb-2">طلب سحب الأرباح</h3>
                        <p className="text-gray-500 text-sm mb-6">سيتم تحويل المبلغ إلى حسابك البريدي (CCP) أو بطاقة الذهبية المسجلة.</p>
                        
                        <div className="space-y-4 mb-8">
                          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold mb-1">المبلغ المتاح للسحب</p>
                            <p className="text-2xl font-black text-brand-green">{teacherData?.balance || 0} دج</p>
                          </div>
                          
                          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-xs text-gray-400 font-bold mb-1">معلومات الدفع</p>
                            <p className={`text-sm font-bold ${teacherData?.ccp ? 'text-brand-navy' : 'text-red-500'}`}>
                              CCP: {teacherData?.ccp || 'غير مسجل (يرجى إضافته في الإعدادات)'}
                            </p>
                            <p className={`text-sm font-bold ${teacherData?.edahabia ? 'text-brand-navy' : 'text-red-500'}`}>
                              الذهبية: {teacherData?.edahabia || 'غير مسجل'}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => setIsWithdrawModalOpen(false)}
                            className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                          >
                            إلغاء
                          </button>
                          <button 
                            onClick={() => {
                              if (!teacherData?.ccp && !teacherData?.edahabia) {
                                toast.error('يرجى إضافة حساب CCP أو البطاقة الذهبية أولاً في الإعدادات للسحب');
                                return;
                              }
                              if ((teacherData?.balance || 0) <= 0) {
                                toast.error('عذراً، لا يوجد رصيد كافٍ للسحب حالياً');
                                return;
                              }
                              toast.success('تم إرسال طلب السحب بنجاح! سيتم التحقق من العملية خلال 24 ساعة.');
                              setIsWithdrawModalOpen(false);
                            }}
                            className="flex-1 py-4 bg-brand-navy text-white font-bold rounded-2xl hover:bg-brand-navy/90 transition-all active:scale-95"
                          >
                            تأكيد الطلب
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Financial Stats */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h4 className="text-gray-500 text-sm font-bold mb-4">توزيع الأرباح</h4>
                    <div className="space-y-6">
                      {[
                        { name: 'اللايف (Live Streams)', value: earningsSummary.total > 0 ? Math.round((earningsSummary.liveStreams / earningsSummary.total) * 100) : 0, color: 'bg-brand-green' },
                        { name: 'الدردشة المميزة', value: earningsSummary.total > 0 ? Math.round((earningsSummary.premiumChats / earningsSummary.total) * 100) : 0, color: 'bg-brand-gold' },
                        { name: 'الدردشة العادية', value: earningsSummary.total > 0 ? Math.round((earningsSummary.normalChats / earningsSummary.total) * 100) : 0, color: 'bg-blue-500' },
                      ].map((item) => (
                        <div key={item.name}>
                          <div className="flex justify-between text-xs font-bold mb-2">
                            <span>{item.name}</span>
                            <span>{item.value}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${item.value}%` }}
                              className={`h-full ${item.color}`} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <TrendingUp className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-lg mb-2">توقع الأرباح</h4>
                    <p className="text-gray-500 text-sm mb-4">بناءً على نموك الحالي، قد تصل أرباحك الشهر القادم إلى:</p>
                    <p className="text-2xl font-black text-brand-navy">45,000 دج</p>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-xl">سجل العمليات المالية</h3>
                  <button className="flex items-center gap-2 text-brand-navy text-sm font-bold bg-white px-4 py-2 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all">
                    <Download className="w-4 h-4" />
                    تحميل التقرير
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-8 py-4">العملية</th>
                        <th className="px-8 py-4">التاريخ</th>
                        <th className="px-8 py-4">المبلغ</th>
                        <th className="px-8 py-4">الحالة</th>
                        <th className="px-8 py-4">الرقم المرجعي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center text-gray-400">
                            <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>لا توجد عمليات مالية مسجلة</p>
                          </td>
                        </tr>
                      ) : (
                        transactions.map((trans) => (
                          <tr key={trans.id} className="hover:bg-gray-50/50 transition-all">
                            <td className="px-8 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  trans.type === 'withdrawal' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                }`}>
                                  {trans.type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                                </div>
                                <span className="font-bold text-brand-navy">
                                  {trans.type === 'withdrawal' ? 'سحب أرباح' : (
                                    trans.reason === 'live_stream' ? 'أرباح لايف' :
                                    trans.reason === 'premium_chat' ? 'دردشة مميزة' :
                                    trans.reason === 'normal_chat' ? 'دردشة عادية' : 
                                    trans.studentName ? `اشتراك: ${trans.studentName}` : 'أرباح متنوعة'
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-4 text-sm text-gray-500">
                              {trans.createdAt ? new Date(trans.createdAt).toLocaleDateString('ar-DZ') : ''}
                            </td>
                            <td className="px-8 py-4">
                              <span className={`font-bold ${trans.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
                                {trans.type === 'withdrawal' ? '-' : '+'}{trans.earnedAmount || trans.amount || 0} دج
                              </span>
                            </td>
                            <td className="px-8 py-4">
                              <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold">
                                مكتمل
                              </span>
                            </td>
                            <td className="px-8 py-4 text-xs text-gray-400 font-mono">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(trans.id.toUpperCase());
                                  toast.success('تم نسخ الرقم المرجعي بنجاح');
                                }}
                                className="hover:text-brand-navy transition-colors flex items-center gap-1 ml-auto"
                                title="نسخ الرقم المرجعي"
                              >
                                #{trans.id.slice(0, 8).toUpperCase()}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="mb-8 border-b border-gray-100 pb-6">
                  <h3 className="font-bold text-2xl mb-2 text-brand-navy flex items-center gap-3">
                    <Settings className="w-6 h-6 text-brand-green" />
                    إعدادات تسعير الخدمات
                  </h3>
                  <p className="text-gray-500 text-sm">قم بضبط أسعار خدماتك بالدينار الجزائري. سيتم خصم هذه المبالغ من رصيد محفظة الطالب عند طلب الخدمة.</p>
                </div>

                <form onSubmit={handleSavePricing} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">تسعيرة المحادثة العادية (الحد الأدنى 300 دج)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="300"
                        value={pricingForm.normalChat}
                        onChange={(e) => setPricingForm({...pricingForm, normalChat: Number(e.target.value)})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand-green outline-none"
                      />
                      <CreditCard className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">تسعيرة المحادثة المميزة الأولوية (الحد الأدنى 1000 دج)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="1000"
                        value={pricingForm.premiumChat}
                        onChange={(e) => setPricingForm({...pricingForm, premiumChat: Number(e.target.value)})}
                        className="w-full bg-brand-gold/5 border border-brand-gold/20 text-brand-navy rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand-gold outline-none"
                      />
                      <Zap className="absolute left-4 top-3 w-5 h-5 text-brand-gold" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">تسعيرة البث المباشر - Live Stream (الحد الأدنى 500 دج)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="500"
                        value={pricingForm.liveStream}
                        onChange={(e) => setPricingForm({...pricingForm, liveStream: Number(e.target.value)})}
                        className="w-full bg-red-50/50 border border-red-100/50 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-red-500 outline-none"
                      />
                      <Video className="absolute left-4 top-3 w-5 h-5 text-red-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">تسعيرة الاشتراك الشهري (يمكن أن تكون 0 دج)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="0"
                        value={pricingForm.subscription}
                        onChange={(e) => setPricingForm({...pricingForm, subscription: Number(e.target.value)})}
                        className="w-full bg-blue-50/50 border border-blue-100/50 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <Users className="absolute left-4 top-3 w-5 h-5 text-blue-400" />
                    </div>
                  </div>

                  <div className="bg-brand-green/10 p-4 rounded-xl border border-brand-green/20 mb-6">
                    <p className="text-xs font-bold text-brand-green leading-relaxed text-center">
                      ملاحظة: سيتم اقتطاع 2% عمولة Chargily من كل عملية. المبلغ المتبقي يُقسم بنسبة 80% للأستاذ و 20% للمنصة. حصتك الصافية هي 78.4% من إجمالي ما يدفعه الطالب.
                    </p>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-brand-green text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-green/20 hover:bg-brand-green/90 active:scale-95 transition-all text-lg"
                  >
                    حفظ التسعيرات الجديدة
                  </button>
                </form>
              </div>

              {/* Working Hours Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mt-6">
                <div className="mb-6 border-b border-gray-100 pb-6">
                  <h3 className="font-bold text-2xl mb-2 text-brand-navy flex items-center gap-3">
                    <Clock className="w-6 h-6 text-brand-gold" />
                    ساعات العمل والتواجد
                  </h3>
                  <p className="text-gray-500 text-sm">حدد الفترة الزمنية التي تكون فيها متاحاً للرد على الشات المميز. سيتم تنبيهك تلقائياً كل 25 دقيقة في حال وجود رسائل غير مجاب عليها.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">⏰ من الساعة</label>
                    <input
                      type="time"
                      value={workingHours.start}
                      onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">🌙 إلى الساعة</label>
                    <input
                      type="time"
                      value={workingHours.end}
                      onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand-gold outline-none"
                    />
                  </div>
                </div>
                <div className="bg-brand-gold/10 border border-brand-gold/20 rounded-xl p-4 mb-6">
                  <p className="text-xs text-brand-gold font-bold text-center">
                    ستتلقى إشعاراً كل 25 دقيقة خلال ساعات عملك تذكيراً بالرد على رسائل الشات المميز
                  </p>
                </div>
                <button
                  onClick={handleSaveWorkingHours}
                  className="w-full bg-brand-gold text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-gold/20 hover:bg-brand-gold/90 active:scale-95 transition-all text-lg"
                >
                  حفظ ساعات العمل
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TeacherDashboard;
