import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, GraduationCap, Users, Mail, Lock, Phone, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { toast } from 'sonner';

const Register = () => {
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    const stepParam = params.get('step');
    
    if (roleParam === 'student' || roleParam === 'teacher') {
      setRole(roleParam as 'student' | 'teacher');
    }
    if (stepParam) {
      setStep(parseInt(stepParam));
    }
  }, [location]);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    wilaya: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: formData.name,
          }
        }
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('فشل إنشاء الحساب');
      
      const user = authData.user;

      // Create profile in Supabase public.users
      const { error: userError } = await supabase.from('users').upsert({
        id: user.id,
        name: formData.name,
        email: formData.email,
        wilaya: formData.wilaya,
        role: role,
        balance: 0,
        iq_coins: 0,
        iq_coins_monthly: 0
      }, { onConflict: 'id' });
      if (userError) throw userError;

      // If teacher, create teacher profile
      if (role === 'teacher') {
        const { error: teacherError } = await supabase.from('teachers').upsert({
          id: user.id,
          name: formData.name,
          wilaya: formData.wilaya,
          is_verified: false,
          balance: 0,
          total_students: 0,
          rating: 5,
          ccp: '',
          edahabia: ''
        }, { onConflict: 'id' });
        if (teacherError) throw teacherError;
      } else {
        // If student, create student profile
        const { error: studentError } = await supabase.from('students').upsert({
          id: user.id,
          name: formData.name,
          wilaya: formData.wilaya,
          balance: 0,
          iq_coins: 0,
          is_subscribed: false
        }, { onConflict: 'id' });
        if (studentError) throw studentError;
      }

      toast.success('تم إنشاء الحساب بنجاح!', {
        description: `مرحباً بك كـ ${role === 'student' ? 'تلميذ' : 'أستاذ'} في منصتنا.`,
      });
      navigate('/profile');
    } catch (error: any) {
      console.error("DEBUG AUTH ERROR:", error);
      
      let errorMessage = error.message || 'خطأ غير معروف';
      if (errorMessage.toLowerCase().includes('failed to fetch')) {
        errorMessage = 'فشل الاتصال بخادم قاعدة البيانات (Network Error). يرجى التأكد من اتصال الإنترنت أو إعدادات Supabase.';
      }
      
      toast.error('فشل إنشاء الحساب: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4 py-20 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green/20 rounded-full -mr-48 -mt-48 blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-gold/10 rounded-full -ml-48 -mb-48 blur-3xl animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-[40px] shadow-2xl overflow-hidden relative z-10"
      >
        <div className="p-8 md:p-12">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-brand-navy mb-2">انضم إلى Learning Tech</h1>
            <p className="text-gray-500 text-sm">أكبر منصة تعليمية في الجزائر بانتظارك</p>
          </div>

          <div className="mb-10 space-y-4">
            <button 
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({ 
                  provider: 'google',
                  options: {
                    redirectTo: `${window.location.origin}/Learning-Tech/`
                  }
                });
                if (error) toast.error('فشل التسجيل بجوجل');
              }}
              className="w-full py-4 rounded-2xl border-2 border-brand-green/20 bg-brand-green/5 font-bold text-sm flex items-center justify-center gap-3 hover:bg-brand-green/10 transition-all text-brand-navy shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              حساب جديد بضغطة واحدة عبر Google
            </button>

            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <span className="relative px-4 bg-white text-[10px] text-gray-400 font-bold uppercase tracking-widest">أو الطريقة التقليدية</span>
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-center mb-8">اختر نوع الحساب</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => setRole('student')}
                  className={`p-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group ${
                    role === 'student' ? 'border-brand-green bg-brand-green/5' : 'border-gray-100 hover:border-brand-green/30'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                    role === 'student' ? 'bg-brand-green text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-brand-green/10 group-hover:text-brand-green'
                  }`}>
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-lg mb-1">أنا تلميذ</h3>
                    <p className="text-[10px] text-gray-400">دروس، لايفات، ومسابقات</p>
                  </div>
                  {role === 'student' && <CheckCircle2 className="w-6 h-6 text-brand-green" />}
                </button>

                <button 
                  onClick={() => setRole('teacher')}
                  className={`p-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group ${
                    role === 'teacher' ? 'border-brand-gold bg-brand-gold/5' : 'border-gray-100 hover:border-brand-gold/30'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                    role === 'teacher' ? 'bg-brand-gold text-brand-navy' : 'bg-gray-50 text-gray-400 group-hover:bg-brand-gold/10 group-hover:text-brand-gold'
                  }`}>
                    <Users className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-lg mb-1">أنا أستاذ</h3>
                    <p className="text-[10px] text-gray-400">تدريس، إدارة، وأرباح</p>
                  </div>
                  {role === 'teacher' && <CheckCircle2 className="w-6 h-6 text-brand-gold" />}
                </button>
              </div>

              <button 
                disabled={!role}
                onClick={() => setStep(2)}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 mt-8 ${
                  role ? 'bg-brand-navy text-white shadow-xl hover:bg-brand-navy/90' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                المتابعة
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 mr-2">الاسم الكامل</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      name="name"
                      required 
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="محمد علي" 
                      className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand-green" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 mr-2">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="tel" 
                      name="phone"
                      required 
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="06XXXXXXXX" 
                      className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand-green" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 mr-2">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="email" 
                    name="email"
                    required 
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="example@mail.com" 
                    className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand-green" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 mr-2">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="password" 
                    name="password"
                    required 
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••" 
                    className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand-green" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 mr-2">الولاية</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text"
                    name="wilaya"
                    required
                    value={formData.wilaya}
                    onChange={handleInputChange}
                    placeholder="مثال: الجزائر العاصمة"
                    className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand-green"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 rounded-2xl font-bold text-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                >
                  رجوع
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-4 rounded-2xl font-bold text-lg bg-brand-green text-white shadow-xl shadow-brand-green/20 hover:bg-brand-green/90 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'إنشاء الحساب'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">
              لديك حساب بالفعل؟ <Link to="/login" className="text-brand-green font-bold hover:underline">تسجيل الدخول</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
