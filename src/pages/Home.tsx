import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { BookOpen, Video, MessageCircle, Award, CreditCard, TrendingUp, Zap, ShieldCheck } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden bg-brand-navy text-white">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://picsum.photos/seed/education/1920/1080" 
            alt="Hero" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-transparent to-transparent" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            مستقبلك يبدأ مع <span className="text-brand-green">Learning Tech</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-gray-300 mb-10"
          >
            أول منصة تعليمية جزائرية متكاملة بالذكاء الاصطناعي والدفع الإلكتروني
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link to="/lessons" className="bg-brand-green hover:bg-brand-green/90 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-lg shadow-brand-green/20">
              ابدأ التعلم الآن
            </Link>
            <Link to="/live" className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-lg shadow-brand-gold/20">
              شاهد البث المباشر
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Registration CTA Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-brand-navy rounded-[40px] p-8 md:p-16 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green/20 rounded-full -mr-48 -mt-48 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-gold/10 rounded-full -ml-48 -mb-48 blur-3xl" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                انضم إلى <span className="text-brand-green">أكبر منصة تعليمية</span> في الجزائر
              </h2>
              <p className="text-xl text-gray-300 mb-10">
                سواء كنت تلميذاً يبحث عن التفوق أو أستاذاً يرغب في مشاركة علمه، نحن هنا لخدمتك.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register" className="bg-brand-green text-white px-10 py-5 rounded-2xl text-lg font-bold shadow-xl shadow-brand-green/20 hover:bg-brand-green/90 transition-all text-center">
                  سجل الآن مجاناً
                </Link>
                <Link to="/login" className="bg-white/10 text-white border border-white/20 px-10 py-5 rounded-2xl text-lg font-bold hover:bg-white/20 transition-all text-center">
                  تسجيل الدخول
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <motion.div 
                whileHover={{ y: -10 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl text-center group hover:bg-brand-green/10 transition-all"
              >
                <div className="w-16 h-16 bg-brand-green rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-green/20">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">للتلاميذ</h3>
                <p className="text-gray-400 text-sm mb-6">دروس، لايفات، ومسابقات بجوائز قيمة</p>
                <Link to="/register?role=student&step=2" className="bg-brand-green text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-brand-green/90 transition-all block">
                  سجل كتلميذ الآن
                </Link>
              </motion.div>

              <motion.div 
                whileHover={{ y: -10 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl text-center group hover:bg-brand-gold/10 transition-all"
              >
                <div className="w-16 h-16 bg-brand-gold rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-gold/20">
                  <Zap className="w-8 h-8 text-brand-navy" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">للأساتذة</h3>
                <p className="text-gray-400 text-sm mb-6">دروس، إدارة، وأرباح تصل لـ 70%</p>
                <Link to="/register?role=teacher&step=2" className="bg-brand-gold text-brand-navy px-6 py-3 rounded-xl font-bold text-sm hover:bg-brand-gold/90 transition-all block">
                  سجل كأستاذ الآن
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
