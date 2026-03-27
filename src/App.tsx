import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Video, 
  MessageCircle, 
  User, 
  Home, 
  CreditCard, 
  Bell, 
  LogOut, 
  Menu, 
  X,
  Star,
  Award,
  TrendingUp,
  ShieldCheck,
  Zap,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { ref, onValue, push, set, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { auth, db, rtdb, handleFirestoreError, OperationType } from './firebase';

import HomePage from './pages/Home';
import LessonsPage from './pages/Lessons';
import LessonViewer from './pages/LessonViewer';
import LiveLessons from './pages/LiveLessons';
import LiveRoom from './pages/LiveRoom';
import NormalChat from './pages/NormalChat';
import PremiumChat from './pages/PremiumChat';
import TeacherDashboard from './pages/TeacherDashboard';
import Archive from './pages/Archive';
import ProfilePage from './pages/Profile';
import PaymentsPage from './pages/Payments';
import PointsPage from './pages/PointsPage';
import Register from './pages/Register';
import Login from './pages/Login';
import ErrorBoundary from './components/ErrorBoundary';

// --- Contexts ---
const AuthContext = createContext<{
  user: FirebaseUser | null;
  profile: any | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const Navbar = () => {
  const { user, profile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'الرئيسية', path: '/', icon: Home },
    { name: 'الدروس', path: '/lessons', icon: BookOpen },
    { name: 'البث المباشر', path: '/live', icon: Video },
    { name: 'شات عادية', path: '/chats', icon: MessageCircle },
    { name: 'شات مميزة', path: '/chats/premium', icon: Zap },
    { name: 'الأرشيف', path: '/archive', icon: ShieldCheck },
    ...(profile?.role === 'teacher' ? [{ name: 'لوحة التحكم', path: '/dashboard', icon: Zap }] : []),
    { name: 'حسابي', path: '/profile', icon: User },
  ];

  const pointsCount = profile?.points || 0;

  return (
    <nav className="bg-brand-navy text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-brand-green p-1.5 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">Learning Tech</span>
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-baseline space-x-4 space-x-reverse">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path 
                      ? 'bg-brand-green text-white' 
                      : 'hover:bg-white/10'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Points Badge */}
                <Link
                  to="/points"
                  className="hidden sm:flex items-center gap-1.5 bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold px-3 py-1.5 rounded-xl text-xs font-black transition-all"
                >
                  <Award className="w-4 h-4" />
                  {pointsCount} نقطة
                </Link>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-medium text-brand-gold">
                    {profile?.role === 'teacher' ? 'أستاذ' : 'تلميذ'}
                  </span>
                  <span className="text-sm font-bold truncate max-w-[100px]">
                    {user.displayName}
                  </span>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <LogOut className="w-5 h-5 text-red-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  to="/login"
                  className="text-gray-300 hover:text-white text-xs font-bold px-3 py-2 transition-all"
                >
                  دخول
                </Link>
                <Link 
                  to="/register?role=student&step=2"
                  className="bg-brand-green hover:bg-brand-green/90 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                >
                  سجل كتلميذ
                </Link>
                <Link 
                  to="/register?role=teacher&step=2"
                  className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                >
                  سجل كأستاذ
                </Link>
              </div>
            )}
            
            <div className="md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-md hover:bg-white/10 focus:outline-none"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-brand-navy border-t border-white/10"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium hover:bg-white/10"
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              {!user && (
                <div className="pt-4 space-y-2 border-t border-white/10 mt-4">
                  <Link 
                    to="/register?role=student&step=2"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center bg-brand-green py-3 rounded-xl font-bold text-sm"
                  >
                    سجل كتلميذ
                  </Link>
                  <Link 
                    to="/register?role=teacher&step=2"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center bg-brand-gold text-brand-navy py-3 rounded-xl font-bold text-sm"
                  >
                    سجل كأستاذ
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          } else {
            // Role will be selected by user in a modal if not exists
            setProfile({ needsRole: true });
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth state error:', error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const selectRole = async (role: 'student' | 'teacher') => {
    if (!user) return;
    const initialProfile = {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      role: role,
      wilaya: 'الجزائر',
      balance: 0,
      points: 0,
      createdAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'users', user.uid), initialProfile);
      // Also create specific profile in teachers/students collection
      if (role === 'teacher') {
        await setDoc(doc(db, 'teachers', user.uid), {
          name: user.displayName,
          isVerified: false,
          balance: 0,
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'students', user.uid), {
          name: user.displayName,
          balance: 0,
          points: 0,
          createdAt: serverTimestamp(),
        });
      }
      setProfile(initialProfile);
      toast.success(`مرحباً بك كـ ${role === 'teacher' ? 'أستاذ' : 'تلميذ'}`);
    } catch (error) {
      toast.error('فشل في حفظ البيانات');
    }
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('تم تسجيل الدخول بنجاح');
    } catch (error) {
      toast.error('فشل تسجيل الدخول');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('تم تسجيل الخروج');
    } catch (error) {
      toast.error('فشل تسجيل الخروج');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-primary">
        <div className="flex flex-col items-center gap-4">
          <Zap className="w-12 h-12 text-brand-green animate-bounce" />
          <span className="text-brand-navy font-bold animate-pulse">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
        <Router>
          <div className="min-h-screen bg-brand-primary font-sans selection:bg-brand-green/30">
            <Toaster position="top-center" richColors />
            <Navbar />
            
            <AnimatePresence>
              {profile?.needsRole && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-[100] bg-brand-navy/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
                  >
                    <Zap className="w-12 h-12 text-brand-green mx-auto mb-6" />
                    <h2 className="text-2xl font-bold mb-2">مرحباً بك في Learning Tech</h2>
                    <p className="text-gray-500 mb-8">يرجى اختيار نوع حسابك للمتابعة</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => selectRole('student')}
                        className="group p-6 rounded-2xl border-2 border-gray-100 hover:border-brand-green hover:bg-brand-green/5 transition-all"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-green group-hover:text-white transition-all">
                          <User className="w-6 h-6" />
                        </div>
                        <span className="font-bold">أنا تلميذ</span>
                      </button>
                      <button 
                        onClick={() => selectRole('teacher')}
                        className="group p-6 rounded-2xl border-2 border-gray-100 hover:border-brand-green hover:bg-brand-green/5 transition-all"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-green group-hover:text-white transition-all">
                          <Award className="w-6 h-6" />
                        </div>
                        <span className="font-bold">أنا أستاذ</span>
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/lessons" element={<LessonsPage />} />
                <Route path="/lesson/:id" element={<LessonViewer />} />
                <Route path="/live" element={<LiveLessons />} />
                <Route path="/live/:id" element={<LiveRoom />} />
                <Route path="/chats" element={<NormalChat />} />
                <Route path="/chats/premium" element={<PremiumChat />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/dashboard" element={<TeacherDashboard />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/points" element={<PointsPage />} />
                <Route path="/parent-reports" element={<div className="p-20 text-center font-bold">تقارير الأولياء قريباً</div>} />
                <Route path="/ai-features" element={<div className="p-20 text-center font-bold">ميزات الذكاء الاصطناعي قريباً</div>} />
                <Route path="/certificates" element={<div className="p-20 text-center font-bold">الشهادات قريباً</div>} />

                {/* ── Chargily Payment Result Pages ──────────────────────────── */}
                <Route path="/payment-success" element={
                  <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4" dir="rtl">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-[3rem] p-10 max-w-md w-full text-center shadow-2xl"
                    >
                      <div className="w-24 h-24 bg-brand-green/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-14 h-14 text-brand-green" />
                      </div>
                      <h1 className="text-3xl font-black text-brand-navy mb-3">تم الدفع بنجاح! 🎉</h1>
                      <p className="text-gray-500 mb-2">تم استلام دفعتك وسيتم شحن رصيدك تلقائياً خلال ثوانٍ.</p>
                      <p className="text-xs text-gray-400 mb-8">إذا لم يظهر الرصيد خلال دقيقة، أعِد تحميل الصفحة.</p>
                      <Link
                        to="/profile"
                        className="inline-flex items-center gap-2 bg-brand-green text-white px-8 py-4 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/20"
                      >
                        عرض رصيدي
                      </Link>
                    </motion.div>
                  </div>
                } />

                <Route path="/payment-failed" element={
                  <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4" dir="rtl">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-[3rem] p-10 max-w-md w-full text-center shadow-2xl"
                    >
                      <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-14 h-14 text-red-500" />
                      </div>
                      <h1 className="text-3xl font-black text-brand-navy mb-3">لم تكتمل العملية</h1>
                      <p className="text-gray-500 mb-8">تم إلغاء عملية الدفع أو فشلت. لم يُخصم أي مبلغ من حسابك.</p>
                      <Link
                        to="/payments"
                        className="inline-flex items-center gap-2 bg-brand-navy text-white px-8 py-4 rounded-2xl font-bold hover:bg-brand-navy/90 transition-all"
                      >
                        حاول مجدداً
                      </Link>
                    </motion.div>
                  </div>
                } />
              </Routes>
            </main>
            
            <footer className="bg-brand-navy text-white py-12 mt-20 border-t border-white/10">
              <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="bg-brand-green p-1.5 rounded-lg">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight">Learning Tech</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    المنصة التعليمية الأولى في الجزائر التي تجمع بين جودة التعليم وأحدث تقنيات الذكاء الاصطناعي لتوفير تجربة تعليمية فريدة لكل تلميذ.
                  </p>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-6">روابط سريعة</h4>
                  <ul className="space-y-3 text-gray-400 text-sm">
                    <li><Link to="/lessons" className="hover:text-brand-green transition-colors">المكتبة التعليمية</Link></li>
                    <li><Link to="/live" className="hover:text-brand-green transition-colors">البث المباشر</Link></li>
                    <li><Link to="/chats" className="hover:text-brand-green transition-colors">المحادثات الخاصة</Link></li>
                    <li><Link to="/profile" className="hover:text-brand-green transition-colors">حسابي الشخصي</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-6">تواصل معنا</h4>
                  <p className="text-gray-400 text-sm mb-4">نحن هنا لمساعدتك في أي وقت.</p>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-green transition-all cursor-pointer">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-green transition-all cursor-pointer">
                      <Bell className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-gray-500 text-xs">
                جميع الحقوق محفوظة &copy; {new Date().getFullYear()} Learning Tech الجزائر
              </div>
            </footer>
          </div>
        </Router>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
