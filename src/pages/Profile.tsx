import { useAuth } from '../App';
import { User, Mail, Award, CreditCard, MapPin, Settings, LogOut, ShieldCheck, Zap, Coins, BookOpen, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabase';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!profile) return null;

  const handleDeleteAccount = async () => {
    if (confirmText !== 'حذف') {
      toast.error('يرجى كتابة كلمة "حذف" للتأكيد');
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      toast.success('تم حذف الحساب نهائياً. وداعاً!');
      logout();
      navigate('/');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'فشل حذف الحساب');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12" dir="rtl">
      <div className="bg-white rounded-[40px] shadow-xl overflow-hidden border border-gray-100 font-arabic">
        {/* Header */}
        <div className="bg-brand-navy h-48 relative">
          <div className="absolute -bottom-16 right-12">
            <div className="w-32 h-32 rounded-[40px] bg-brand-green border-8 border-white flex items-center justify-center text-white text-5xl font-bold shadow-xl">
              {profile.name?.[0] || 'U'}
            </div>
          </div>
          <div className="absolute bottom-4 left-12 flex gap-3">
            <button className="bg-white/10 backdrop-blur-md text-white p-3 rounded-2xl hover:bg-white/20 transition-all">
              <Settings className="w-6 h-6" />
            </button>
            <button 
              onClick={logout}
              className="bg-red-500/20 backdrop-blur-md text-red-500 p-3 rounded-2xl hover:bg-red-500/30 transition-all"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="pt-20 pb-12 px-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-brand-navy">{profile.name}</h1>
              <p className="text-gray-500 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {profile.email}
              </p>
            </div>
            <div className="flex gap-3">
              <div className={`px-6 py-2 rounded-2xl font-bold text-sm ${profile.role === 'teacher' ? 'bg-brand-navy/10 text-brand-navy' : 'bg-brand-green/10 text-brand-green'}`}>
                {profile.role === 'teacher' ? 'أستاذ' : 'تلميذ'}
              </div>
              
              {profile.role === 'teacher' ? (
                <div className="bg-brand-gold/10 text-brand-gold px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  حساب موثق
                </div>
              ) : (
                <div className={`px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 ${profile.isSubscribed ? 'bg-brand-gold/10 text-brand-gold shadow-sm' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                  <Award className="w-4 h-4" />
                  {profile.isSubscribed ? 'مشترك (Premium)' : 'باقة مجانية (محدودة)'}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-50 p-6 rounded-3xl text-center">
              <CreditCard className="w-8 h-8 text-brand-green mx-auto mb-3" />
              <h3 className="text-gray-500 text-xs font-medium mb-1">الرصيد الحالي</h3>
              <p className="text-2xl font-bold text-brand-navy">{profile.balance || 0} دج</p>
            </div>
            {/* بطاقة النقاط */}
            <Link
              to="/points"
              className="bg-gradient-to-br from-brand-gold/10 to-amber-50 border border-brand-gold/20 p-6 rounded-3xl text-center hover:from-brand-gold/20 hover:border-brand-gold/40 transition-all group"
            >
              <Coins className="w-8 h-8 text-brand-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-gray-500 text-xs font-medium mb-1">IQ Coins (شهري)</h3>
              <p className="text-2xl font-bold text-brand-navy">{profile.iq_coins_monthly || 0} IQ</p>
              <span className="text-[10px] text-brand-gold font-bold mt-1 block">عرض محفظتي ←</span>
            </Link>
            <div className="bg-gray-50 p-6 rounded-3xl text-center">
              <MapPin className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="text-gray-500 text-xs font-medium mb-1">الولاية</h3>
              <p className="text-2xl font-bold text-brand-navy">{profile.wilaya || 'غير محدد'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-6 text-brand-navy">إجراءات سريعة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {profile.role === 'teacher' ? (
                <Link to="/teacher-dashboard" className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-3xl hover:bg-gray-50 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-navy/10 flex items-center justify-center text-brand-navy group-hover:bg-brand-navy group-hover:text-white transition-all shadow-sm">
                      <Settings className="w-6 h-6" />
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold text-brand-navy">لوحة تحكم الأستاذ</h4>
                      <p className="text-xs text-gray-500">إدارة الدروس، البث المباشر، والأرباح</p>
                    </div>
                  </div>
                  <Zap className="w-5 h-5 text-gray-300 transition-transform group-hover:text-brand-gold group-hover:scale-110" />
                </Link>
              ) : (
                <Link to="/payments" className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-3xl hover:bg-gray-50 transition-all group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green group-hover:bg-brand-green group-hover:text-white transition-all shadow-sm">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold text-brand-navy">شحن المحفظة</h4>
                      <p className="text-xs text-gray-500">عبر الذهبية، بريدي موب، أو CIB</p>
                    </div>
                  </div>
                  <Zap className="w-5 h-5 text-gray-300 transition-transform group-hover:text-brand-gold group-hover:scale-110" />
                </Link>
              )}
              
              <Link to="/lessons" className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-3xl hover:bg-gray-50 transition-all group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-brand-navy">{profile.role === 'teacher' ? 'تصفح محتواي' : 'عرض الدروس'}</h4>
                    <p className="text-xs text-gray-500">{profile.role === 'teacher' ? 'مراجعة كيف تظهر دروسك للطلاب' : 'شاهد وتعلم من أفضل الأساتذة الموثقين'}</p>
                  </div>
                </div>
                <Zap className="w-5 h-5 text-gray-300 transition-transform group-hover:text-brand-gold group-hover:scale-110" />
              </Link>

              {/* بطاقة سريعة لصفحة النقاط (للتلاميذ فقط) */}
              {profile.role === 'student' && (
                <Link to="/points" className="flex items-center justify-between p-6 bg-gradient-to-r from-brand-gold/5 to-amber-50 border border-brand-gold/20 rounded-3xl hover:border-brand-gold/50 transition-all group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-brand-gold group-hover:bg-brand-gold group-hover:text-white transition-all shadow-sm">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold text-brand-navy">استبدال IQ Coins</h4>
                      <p className="text-xs text-gray-500">لديك {profile.iq_coins || 0} عملة — اكتشف كيف تستخدمها</p>
                    </div>
                  </div>
                  <Zap className="w-5 h-5 text-gray-300 transition-transform group-hover:text-brand-gold group-hover:scale-110" />
                </Link>
              )}
            </div>

            {/* Danger Zone */}
            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                منطقة الخطر
              </h3>
              <div className="bg-red-50 p-6 rounded-3xl border border-red-100 shadow-sm">
                <p className="text-sm text-red-600 mb-4 opacity-80 leading-relaxed font-bold">
                  هل ترغب في مغادرتنا؟ حذف الحساب سيؤدي إلى مسح كافة بياناتك، رصيدك، وتاريخك الدراسي نهائياً. لا يمكن التراجع عن هذا الإجراء.
                </p>
                <button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="bg-red-500 text-white px-8 py-3 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  حذف الحساب نهائياً
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-brand-navy mb-4">هل أنت متأكد فعلاً؟</h3>
              <p className="text-gray-500 mb-8 text-sm leading-relaxed font-bold">
                سيتم حذف كافة بياناتك الشخصية، رصيدك المالي (**{profile.balance} دج**)، وعملاتك الرقمية (**{profile.iq_coins} IQ**). لتأكيد الحذف النهائي، اكتب كلمة "**حذف**" في الأسفل:
              </p>
              
              <input 
                type="text"
                placeholder='اكتب "حذف" هنا'
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-center font-bold text-brand-navy mb-6 focus:ring-2 focus:ring-red-500 outline-none"
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-500 hover:bg-gray-200 transition-all font-bold"
                >
                  تراجع
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || confirmText !== 'حذف'}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:bg-red-200 disabled:shadow-none"
                >
                  {isDeleting ? 'جاري الحذف...' : 'نعم، احذف'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
