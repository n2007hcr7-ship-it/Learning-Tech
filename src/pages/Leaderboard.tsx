import { useState, useEffect } from 'react';
import { Trophy, MapPin, Globe, Zap, Medal, Crown, Star, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../supabase';
import { useAuth } from '../App';

const wilayasList = [
  'أدرار','الشلف','الأغواط','أم البواقي','باتنة','بجاية','بسكرة','بشار',
  'البليدة','البويرة','تمنراست','تبسة','تلمسان','تيارت','تيزي وزو','الجزائر',
  'الجلفة','جيجل','سطيف','سعيدة','سكيكدة','سيدي بلعباس','عنابة','قالمة',
  'قسنطينة','المدية','مستغانم','المسيلة','معسكر','ورقلة','وهران','البيض',
  'إليزي','برج بوعريريج','بومرداس','الطارف','تندوف','تيسمسيلت','الوادي',
  'خنشلة','سوق أهراس','تيبازة','ميلة','عين الدفلى','النعامة','عين تموشنت',
  'غرداية','غليزان','تيميمون','برج باجي مختار','أولاد جلال','بني عباس',
  'عين صالح','عين قزام','تقرت','جانت','المغير','المنيعة'
];

const Leaderboard = () => {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'national' | 'wilaya'>('national');
  const [nationalRank, setNationalRank] = useState<any[]>([]);
  const [wilayaRank, setWilayaRank] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWilaya, setSelectedWilaya] = useState(profile?.wilaya || '');

  useEffect(() => {
    fetchNational();
  }, []);

  useEffect(() => {
    if (selectedWilaya) fetchWilaya(selectedWilaya);
  }, [selectedWilaya]);

  const fetchNational = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('id, name, iq_coins_monthly, wilaya, avatar_url')
      .eq('role', 'student')
      .order('iq_coins_monthly', { ascending: false })
      .limit(50);

    if (data) {
      setNationalRank(data);
      if (user) {
        const myRank = data.findIndex(u => u.id === user.id);
        setUserRank(myRank >= 0 ? { rank: myRank + 1, data: data[myRank] } : null);
      }
    }
    setLoading(false);
  };

  const fetchWilaya = async (wilaya: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('id, name, iq_coins_monthly, wilaya, avatar_url')
      .eq('role', 'student')
      .eq('wilaya', wilaya)
      .order('iq_coins_monthly', { ascending: false })
      .limit(20);

    if (data) setWilayaRank(data);
    setLoading(false);
  };

  const getMedalColor = (rank: number) => {
    if (rank === 0) return 'from-yellow-400 to-amber-500';
    if (rank === 1) return 'from-gray-300 to-slate-400';
    if (rank === 2) return 'from-amber-600 to-orange-700';
    return 'from-brand-green/30 to-emerald-600/30';
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 0) return <Crown className="w-5 h-5 text-yellow-300" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-gray-200" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-amber-500" />;
    return <span className="text-white font-black text-sm">#{rank + 1}</span>;
  };

  const displayList = tab === 'national' ? nationalRank : wilayaRank;

  return (
    <div className="min-h-screen bg-brand-navy text-white pb-20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 pt-12 pb-8 relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-6 py-3 mb-6">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <span className="font-bold text-yellow-300">لوحة الشرف الشهرية</span>
            </div>
            <h1 className="text-4xl font-black mb-3">
              أفضل <span className="text-yellow-400">IQ Coins</span> 🏆
            </h1>
            <p className="text-gray-400 text-sm">
              يتجدد الترتيب كل شهر • الأول يحصل على شات مميز مجاني لشهر!
            </p>
          </div>

          {/* Prize Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border border-yellow-500/30 rounded-3xl p-5 mb-8 flex items-center gap-4"
          >
            <div className="w-14 h-14 bg-yellow-500 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Star className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-yellow-300 mb-1">🎁 جائزة المركز الأول</h3>
              <p className="text-sm text-gray-300">
                صاحب المركز الأول يحصل على <strong className="text-yellow-400">شات مميز مجاني لمدة شهر</strong> مع أي أستاذ من اختياره!
              </p>
            </div>
          </motion.div>

          {/* My Rank Card */}
          {userRank && (
            <div className="bg-brand-green/10 border border-brand-green/30 rounded-2xl p-4 mb-6 flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center font-black">
                #{userRank.rank}
              </div>
              <div>
                <p className="text-xs text-gray-400">ترتيبك الحالي</p>
                <p className="font-bold">{userRank.data?.name}</p>
              </div>
              <div className="mr-auto flex items-center gap-2 bg-yellow-500/10 px-3 py-1.5 rounded-xl">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-yellow-300">{userRank.data?.iq_coins_monthly} IQ</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 bg-white/5 p-1 rounded-2xl mb-6">
            <button
              onClick={() => setTab('national')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${tab === 'national' ? 'bg-white text-brand-navy shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <Globe className="w-4 h-4" />
              الترتيب الوطني
            </button>
            <button
              onClick={() => setTab('wilaya')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${tab === 'wilaya' ? 'bg-white text-brand-navy shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <MapPin className="w-4 h-4" />
              الترتيب الولائي
            </button>
          </div>

          {/* Wilaya Selector */}
          {tab === 'wilaya' && (
            <div className="mb-6">
              <select
                value={selectedWilaya}
                onChange={e => setSelectedWilaya(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="" className="bg-gray-900">اختر الولاية...</option>
                {wilayasList.map(w => (
                  <option key={w} value={w} className="bg-gray-900">{w}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="max-w-4xl mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-8 h-8 text-yellow-400 animate-spin" />
          </div>
        ) : displayList.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="font-bold">لا توجد بيانات بعد</p>
            <p className="text-sm mt-1">أكمل دروسك لتظهر في الترتيب!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayList.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  student.id === user?.id
                    ? 'bg-brand-green/10 border-brand-green/40'
                    : 'bg-white/5 border-white/5 hover:bg-white/8'
                }`}
              >
                {/* Rank Badge */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getMedalColor(index)} flex items-center justify-center flex-shrink-0`}>
                  {getMedalIcon(index)}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green to-emerald-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {student.name?.[0] || '؟'}
                </div>

                {/* Info */}
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <h4 className={`font-bold ${student.id === user?.id ? 'text-brand-green' : 'text-white'}`}>
                      {student.name}
                      {student.id === user?.id && <span className="text-xs text-brand-green/70 mr-1">(أنت)</span>}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                    <MapPin className="w-3 h-3" />
                    {student.wilaya || 'غير محدد'}
                  </p>
                </div>

                {/* IQ Coins */}
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 rounded-xl">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="font-black text-yellow-300">{student.iq_coins_monthly}</span>
                  <span className="text-xs text-gray-500">IQ</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
