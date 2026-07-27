import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, Lock, LogIn, Zap, User, Phone, MapPin,
  GraduationCap, Users, CheckCircle2, Eye, EyeOff, ArrowRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { toast } from 'sonner';

const algerianWilayas = [
  "أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار","البليدة","البويرة",
  "تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر العاصمة","الجلفة","جيجل","سطيف","سعيدة",
  "سكيكدة","سيدي بلعباس","عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة",
  "وهران","البيض","إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تيسمسيلت","الوادي","خنشلة",
  "سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تموشنت","غرداية","غليزان","تيميمون",
  "برج باجي مختار","أولاد جلال","بني عباس","عين صالح","عين قزام","تقرت","جانت","المغير","المنيعة"
];

// ─── Login Tab ──────────────────────────────────────────────────────────────
const LoginTab = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        toast.success('تم تسجيل الدخول بنجاح! 🎉');
        navigate('/profile');
      } else {
        toast.info('الرجاء التحقق من بريدك الإلكتروني لتفعيل الحساب');
      }
    } catch (error: any) {
      toast.error(error.message || 'بيانات الدخول غير صحيحة. تحقق من البريد وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + import.meta.env.BASE_URL }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'فشل تسجيل الدخول بجوجل');
    }
  };

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Google */}
      <button
        onClick={handleGoogleLogin}
        className="w-full py-3.5 rounded-2xl border-2 border-brand-green/20 bg-brand-green/5 font-bold text-sm flex items-center justify-center gap-3 hover:bg-brand-green/10 transition-all text-brand-navy mb-4"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
        الدخول السريع عبر Google
      </button>

      <div className="relative flex items-center justify-center py-3 mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100" />
        </div>
        <span className="relative px-4 bg-white text-[10px] text-gray-400 font-bold">أو عبر البريد الإلكتروني</span>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 mr-1">البريد الإلكتروني</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 text-xs focus:ring-2 focus:ring-brand-green transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 mr-1">كلمة المرور</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-10 py-3 text-xs focus:ring-2 focus:ring-brand-green transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-navy transition-colors"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" className="text-[10px] text-brand-green font-bold hover:underline">
            نسيت كلمة المرور؟
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold text-sm bg-brand-navy text-white hover:bg-brand-navy/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-navy/20"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              تسجيل الدخول
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};

// ─── Register Tab ────────────────────────────────────────────────────────────
const RegisterTab = () => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', wilaya: 'الجزائر العاصمة'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGoogleRegister = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + import.meta.env.BASE_URL }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'فشل التسجيل بجوجل');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { display_name: formData.name } }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('فشل إنشاء الحساب');

      const userId = authData.user.id;

      await supabase.from('users').upsert({
        id: userId, name: formData.name, email: formData.email,
        wilaya: formData.wilaya, role, balance: 0, iq_coins: 0, iq_coins_monthly: 0
      }, { onConflict: 'id' });

      if (role === 'teacher') {
        await supabase.from('teachers').upsert({
          id: userId, name: formData.name, wilaya: formData.wilaya,
          is_verified: false, balance: 0, total_students: 0, rating: 5, ccp: '', edahabia: ''
        }, { onConflict: 'id' });
      } else {
        await supabase.from('students').upsert({
          id: userId, name: formData.name, wilaya: formData.wilaya,
          balance: 0, iq_coins: 0, is_subscribed: false
        }, { onConflict: 'id' });
      }

      toast.success(`مرحباً بك كـ ${role === 'student' ? 'تلميذ' : 'أستاذ'}! 🎉`);
      navigate('/profile');
    } catch (error: any) {
      let msg = error.message || 'خطأ غير معروف';
      if (msg.toLowerCase().includes('failed to fetch')) msg = 'فشل الاتصال بالخادم. تحقق من الإنترنت.';
      toast.error('فشل إنشاء الحساب: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="register"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {step === 1 ? (
        /* Step 1: Choose role */
        <div className="space-y-4">
          {/* Google */}
          <button
            onClick={handleGoogleRegister}
            className="w-full py-3.5 rounded-2xl border-2 border-brand-green/20 bg-brand-green/5 font-bold text-sm flex items-center justify-center gap-3 hover:bg-brand-green/10 transition-all text-brand-navy"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            تسجيل سريع عبر Google
          </button>

          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <span className="relative px-4 bg-white text-[10px] text-gray-400 font-bold">أو اختر نوع حسابك</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRole('student')}
              className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 group ${
                role === 'student' ? 'border-brand-green bg-brand-green/5' : 'border-gray-100 hover:border-brand-green/40'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                role === 'student' ? 'bg-brand-green text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-brand-green/10 group-hover:text-brand-green'
              }`}>
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">تلميذ</p>
                <p className="text-[9px] text-gray-400">تعلم واكتسب IQ</p>
              </div>
              {role === 'student' && <CheckCircle2 className="w-4 h-4 text-brand-green" />}
            </button>

            <button
              onClick={() => setRole('teacher')}
              className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 group ${
                role === 'teacher' ? 'border-brand-gold bg-brand-gold/5' : 'border-gray-100 hover:border-brand-gold/40'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                role === 'teacher' ? 'bg-brand-gold text-brand-navy' : 'bg-gray-50 text-gray-400 group-hover:bg-brand-gold/10 group-hover:text-brand-gold'
              }`}>
                <Users className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">أستاذ</p>
                <p className="text-[9px] text-gray-400">درّس وحقق أرباح</p>
              </div>
              {role === 'teacher' && <CheckCircle2 className="w-4 h-4 text-brand-gold" />}
            </button>
          </div>

          <button
            disabled={!role}
            onClick={() => setStep(2)}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              role
                ? 'bg-brand-navy text-white hover:bg-brand-navy/90 shadow-lg shadow-brand-navy/20'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            المتابعة
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Step 2: Fill details */
        <form onSubmit={handleRegister} className="space-y-3">
          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400">الاسم الكامل</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" name="name" required value={formData.name} onChange={handleChange}
                  placeholder="محمد علي"
                  className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-3 py-3 text-xs focus:ring-2 focus:ring-brand-green" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" name="phone" required value={formData.phone} onChange={handleChange}
                  placeholder="06XXXXXXXX"
                  className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-3 py-3 text-xs focus:ring-2 focus:ring-brand-green" />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" name="email" required value={formData.email} onChange={handleChange}
                placeholder="example@mail.com"
                className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-3 py-3 text-xs focus:ring-2 focus:ring-brand-green" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type={showPass ? 'text' : 'password'} name="password" required value={formData.password} onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-9 py-3 text-xs focus:ring-2 focus:ring-brand-green" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-navy">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Wilaya */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400">الولاية</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select name="wilaya" value={formData.wilaya} onChange={handleChange}
                className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-3 py-3 text-xs focus:ring-2 focus:ring-brand-green appearance-none">
                {algerianWilayas.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all">
              رجوع
            </button>
            <button type="submit" disabled={loading}
              className={`flex-[2] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                role === 'teacher'
                  ? 'bg-brand-gold text-brand-navy hover:bg-brand-gold/90 shadow-lg shadow-brand-gold/20'
                  : 'bg-brand-green text-white hover:bg-brand-green/90 shadow-lg shadow-brand-green/20'
              }`}>
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : 'إنشاء الحساب'}
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
};

// ─── Main AuthPage ───────────────────────────────────────────────────────────
const Login = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4 py-16 relative overflow-hidden" dir="rtl">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-green/15 rounded-full -mr-64 -mt-64 blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-gold/10 rounded-full -ml-64 -mb-64 blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-green/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full relative z-10"
      >
        {/* Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-brand-navy to-[#16213E] p-8 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #00C853 0%, transparent 50%), radial-gradient(circle at 80% 20%, #FFB300 0%, transparent 50%)' }} />
            <div className="relative z-10">
              <div className="bg-brand-green w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-green/40">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Learning Tech</h1>
              <p className="text-white/60 text-xs">المنصة التعليمية الأولى في الجزائر</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-50 mx-6 mt-6 rounded-2xl p-1">
            {[
              { id: 'login', label: 'تسجيل الدخول' },
              { id: 'register', label: 'إنشاء حساب' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'login' | 'register')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 relative ${
                  activeTab === tab.id
                    ? 'bg-white text-brand-navy shadow-md'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 bg-white rounded-xl shadow-md -z-10"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'login' ? <LoginTab key="login" /> : <RegisterTab key="register" />}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="pb-6 text-center">
            {activeTab === 'login' ? (
              <p className="text-xs text-gray-400">
                ليس لديك حساب؟{' '}
                <button onClick={() => setActiveTab('register')} className="text-brand-green font-bold hover:underline">
                  أنشئ حساباً الآن
                </button>
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                لديك حساب بالفعل؟{' '}
                <button onClick={() => setActiveTab('login')} className="text-brand-green font-bold hover:underline">
                  سجّل الدخول
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-white/30 text-[10px] mt-4">
          بالتسجيل توافق على شروط الاستخدام وسياسة الخصوصية
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
