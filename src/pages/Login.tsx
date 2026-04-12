import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, ArrowRight, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success('تم تسجيل الدخول بنجاح!');
      navigate('/profile');
    } catch (error: any) {
      toast.error('فشل تسجيل الدخول: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
      // Note: Supabase OAuth redirects the page by default, so below lines might not run depending on config.
    } catch (error: any) {
      toast.error('فشل تسجيل الدخول بجوجل');
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
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl overflow-hidden relative z-10"
      >
        <div className="p-8 md:p-12">
          <div className="text-center mb-10">
            <div className="bg-brand-green w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-green/20">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-brand-navy mb-2">تسجيل الدخول</h1>
            <p className="text-gray-500 text-sm">مرحباً بك مجدداً في Learning Tech</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 mr-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com" 
                  className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-brand-green transition-all" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 mr-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-brand-green transition-all" 
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-xs text-brand-green font-bold hover:underline">نسيت كلمة المرور؟</button>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-lg bg-brand-green text-white shadow-xl shadow-brand-green/20 hover:bg-brand-green/90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  تسجيل الدخول
                  <LogIn className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <span className="relative px-4 bg-white text-xs text-gray-400 font-bold">أو عبر</span>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="w-full py-4 rounded-2xl border-2 border-gray-100 font-bold text-sm flex items-center justify-center gap-3 hover:bg-gray-50 transition-all"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              الدخول عبر جوجل
            </button>
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">
              ليس لديك حساب؟ <Link to="/register" className="text-brand-green font-bold hover:underline">إنشاء حساب جديد</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
