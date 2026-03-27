import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { motion } from 'motion/react';
import {
  Award, Zap, BookOpen, MessageCircle, Video,
  TrendingUp, Gift, CheckCircle2, Lock, Star,
  ArrowRight, Crown, Shield, Coins
} from 'lucide-react';
import { toast } from 'sonner';

// --- Types ---
interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: React.ElementType;
  color: string;
  route: string;
  available: boolean;
}

interface EarnActivity {
  id: string;
  title: string;
  points: number;
  icon: React.ElementType;
  description: string;
}

// --- Data ---
const REWARDS: Reward[] = [
  {
    id: 'live',
    title: 'دخول البث المباشر',
    description: 'احضر حصصاً مباشرة مع أفضل الأساتذة',
    cost: 25,
    icon: Video,
    color: 'from-purple-500 to-violet-600',
    route: '/live',
    available: true,
  },
  {
    id: 'chat',
    title: 'محادثة عادية مع الأستاذ',
    description: 'اطرح أسئلتك مباشرة على الأستاذ',
    cost: 100,
    icon: MessageCircle,
    color: 'from-blue-500 to-cyan-600',
    route: '/chats',
    available: true,
  },
  {
    id: 'premium_chat',
    title: 'محادثة مميزة VIP',
    description: 'أولوية قصوى وردود سريعة مضمونة',
    cost: 250,
    icon: Crown,
    color: 'from-amber-500 to-yellow-600',
    route: '/chats/premium',
    available: true,
  },
];

const EARN_ACTIVITIES: EarnActivity[] = [
  {
    id: 'watch_lesson',
    title: 'إكمال مشاهدة درس',
    points: 1,
    icon: BookOpen,
    description: 'شاهد أي درس حتى نهايته للحصول على نقطة',
  },
  {
    id: 'daily_streak',
    title: 'سلسلة يومية (قريباً)',
    points: 5,
    icon: TrendingUp,
    description: 'ادرس يومياً لتراكم مكافآت إضافية',
  },
  {
    id: 'quiz',
    title: 'اجتياز اختبار (قريباً)',
    points: 10,
    icon: Star,
    description: 'أكمل التمارين للحصول على نقاط إضافية',
  },
];

// ============================================================
// Points Page Component
// ============================================================
const PointsPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    const fetchData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setCompletedCount((data.completedLessons || []).length);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const currentPoints = profile?.points || 0;
  const progressToNext = Math.min((currentPoints % 100) / 100 * 100, 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-navy text-white pb-24" dir="rtl">

      {/* ── Hero Banner ─────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy via-[#0d2137] to-[#0a1f30] border-b border-white/5">
        {/* background glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-400/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Coin Icon */}
            <div className="w-24 h-24 bg-gradient-to-br from-brand-gold to-yellow-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-500/30">
              <Coins className="w-12 h-12 text-brand-navy" />
            </div>

            <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              محفظة النقاط
            </h1>
            <p className="text-gray-400 text-lg mb-10">
              تعلّم واكسب — أنفق النقاط للوصول إلى خدمات VIP مجاناً
            </p>

            {/* Points Balance Card */}
            <div className="inline-flex flex-col items-center bg-white/5 border border-white/10 backdrop-blur-sm rounded-[2.5rem] px-16 py-8 shadow-2xl">
              <span className="text-8xl font-black text-brand-gold tabular-nums leading-none">
                {currentPoints.toLocaleString('ar-DZ')}
              </span>
              <span className="text-gray-400 text-xl font-bold mt-2 tracking-wider">نقطة متاحة</span>

              {/* Progress to next milestone */}
              <div className="w-full mt-6">
                <div className="flex justify-between text-xs text-gray-500 mb-2 font-bold">
                  <span>التقدم نحو المستوى التالي</span>
                  <span>{currentPoints % 100}/100</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressToNext}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="bg-gradient-to-r from-brand-green to-emerald-400 h-2 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-12 space-y-14">

        {/* ── Stats Row ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-4"
        >
          {[
            { label: 'رصيد النقاط', value: currentPoints, icon: Award, color: 'text-brand-gold' },
            { label: 'دروس مكتملة', value: completedCount, icon: BookOpen, color: 'text-brand-green' },
            { label: 'نقاط مكتسبة', value: completedCount, icon: TrendingUp, color: 'text-blue-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-3xl p-6 text-center">
              <stat.icon className={`w-7 h-7 mx-auto mb-3 ${stat.color}`} />
              <div className="text-3xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-gray-400 font-bold mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* ── Rewards Catalog ─────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Gift className="w-6 h-6 text-brand-gold" />
            <h2 className="text-2xl font-black">متجر المكافآت</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {REWARDS.map((reward, i) => {
              const canAfford = currentPoints >= reward.cost;
              return (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  className={`relative bg-white/5 border rounded-3xl p-6 flex flex-col gap-4 transition-all duration-300 ${
                    canAfford
                      ? 'border-white/10 hover:border-brand-green/50 hover:bg-white/10 cursor-pointer'
                      : 'border-white/5 opacity-60'
                  }`}
                >
                  {/* Gradient icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${reward.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                    <reward.icon className="w-7 h-7 text-white" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-lg leading-tight mb-1">{reward.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{reward.description}</p>
                  </div>

                  {/* Cost badge */}
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black ${
                      canAfford ? 'bg-brand-gold/20 text-brand-gold' : 'bg-white/5 text-gray-500'
                    }`}>
                      <Coins className="w-4 h-4" />
                      {reward.cost} نقطة
                    </div>

                    {canAfford ? (
                      <Link
                        to={reward.route}
                        className="flex items-center gap-1 bg-brand-green hover:bg-brand-green/90 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      >
                        استخدم <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-500 text-xs font-bold">
                        <Lock className="w-4 h-4" />
                        {reward.cost - currentPoints} نقطة ناقصة
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ── How to Earn ─────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-brand-green" />
            <h2 className="text-2xl font-black">كيف تكسب المزيد؟</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {EARN_ACTIVITIES.map((activity, i) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.07 }}
                className="bg-gradient-to-br from-brand-green/10 to-emerald-900/20 border border-brand-green/20 rounded-3xl p-6 relative overflow-hidden"
              >
                <div className="absolute -bottom-4 -left-4 opacity-10">
                  <activity.icon className="w-24 h-24 text-brand-green" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-brand-green/20 rounded-2xl flex items-center justify-center">
                      <activity.icon className="w-6 h-6 text-brand-green" />
                    </div>
                    <span className="text-brand-gold font-black text-xl">+{activity.points}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{activity.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{activity.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Security Notice ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white/3 border border-white/5 rounded-3xl p-6 flex items-start gap-4"
        >
          <Shield className="w-8 h-8 text-brand-green flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-base mb-1 text-brand-green">نظام نقاط آمن ومحمي</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              يتم التحقق من كل عملية كسب أو إنفاق للنقاط عبر خوادم Firebase الآمنة. لا يمكن تزوير النقاط أو التلاعب بها من قِبل أي مستخدم، وكل درس مكتمل يُسجَّل مرة واحدة فقط لمنع الغش.
            </p>
          </div>
        </motion.div>

        {/* ── CTA ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="text-center pb-4"
        >
          <Link
            to="/lessons"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-brand-green to-emerald-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-brand-green/30 hover:shadow-brand-green/50 transition-all hover:scale-105"
          >
            <BookOpen className="w-6 h-6" />
            ابدأ الدراسة واكسب النقاط الآن
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

      </div>
    </div>
  );
};

export default PointsPage;
