import React, { useState } from "react";
import { Lock, Mail, Shield, User, Globe, Moon, Sun } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (token: string, user: any, organization: any) => void;
  isArabic: boolean;
  setIsArabic: (val: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export default function Login({
  onLoginSuccess,
  isArabic,
  setIsArabic,
  isDarkMode,
  setIsDarkMode
}: LoginProps) {
  const [activePortal, setActivePortal] = useState<"employee" | "ceo">("employee");
  const [email, setEmail] = useState(
    activePortal === "employee" ? "employee@mycompany.com" : "admin@mycompany.com"
  );
  const [password, setPassword] = useState(
    activePortal === "employee" ? "password123" : "admin123"
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const t = {
    en: {
      title: "CRM Enterprise SaaS",
      subtitle: "Secure Tenant Access Gateway",
      employeeTab: "Employee Access Portal",
      ceoTab: "Executive CEO Portal",
      emailLabel: "Work Email Address",
      passwordLabel: "Account Password",
      loginButton: "Authenticate & Enter",
      loadingText: "Verifying credentials...",
      errorInvalid: "Invalid email or password",
      demoCredentials: "Demo Access: Use prefilled values",
      ceoWelcome: "CEO Panel (Green Interface Theme)",
      employeeWelcome: "Employee Panel (Blue Interface Theme)",
      googleLogin: "Sign in with Google",
    },
    ar: {
      title: "نظام إدارة علاقات العملاء (CRM)",
      subtitle: "بوابة الوصول الآمن للمؤسسة",
      employeeTab: "بوابة دخول الموظفين",
      ceoTab: "بوابة دخول المدير التنفيذي (CEO)",
      emailLabel: "البريد الإلكتروني للعمل",
      passwordLabel: "كلمة المرور",
      loginButton: "مصادقة ودخول",
      loadingText: "جاري التحقق من الهوية...",
      errorInvalid: "البريد الإلكتروني أو كلمة المرور غير صالحة",
      demoCredentials: "نسخة تجريبية: استخدم القيم المعبأة تلقائياً",
      ceoWelcome: "لوحة المدير التنفيذي (السمة الخضراء)",
      employeeWelcome: "لوحة الموظفين (السمة الزرقاء)",
      googleLogin: "تسجيل الدخول باستخدام جوجل",
    }
  };

  const currentT = isArabic ? t.ar : t.en;

  const handlePortalChange = (portal: "employee" | "ceo") => {
    setActivePortal(portal);
    setEmail(portal === "employee" ? "employee@mycompany.com" : "admin@mycompany.com");
    setPassword(portal === "employee" ? "password123" : "admin123");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || currentT.errorInvalid);
      }

      const data = await res.json();
      onLoginSuccess(data.token, data.user, data.organization);
    } catch (err: any) {
      console.error(err);
      setError(err.message || currentT.errorInvalid);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role: activePortal })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || currentT.errorInvalid);
      }

      const data = await res.json();
      onLoginSuccess(data.token, data.user, data.organization);
    } catch (err: any) {
      console.error(err);
      setError(err.message || currentT.errorInvalid);
    } finally {
      setLoading(false);
    }
  };

  // Theme-specific colors
  const accentColor = activePortal === "ceo" ? "emerald" : "blue";
  const btnColorClass =
    activePortal === "ceo"
      ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
      : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
  const textColorClass = activePortal === "ceo" ? "text-emerald-500" : "text-blue-500";
  const borderColorClass = activePortal === "ceo" ? "border-emerald-500" : "border-blue-500";
  const ringColorClass = activePortal === "ceo" ? "focus:ring-emerald-500" : "focus:ring-blue-500";

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 p-4 transition-all duration-300 relative overflow-hidden"
    >
      {/* Dynamic Colored Ambient Glows */}
      <div
        className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20 dark:opacity-10 transition-all duration-700 bg-${accentColor}-400`}
      />
      <div
        className={`absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20 dark:opacity-10 transition-all duration-700 bg-${accentColor}-400`}
      />

      {/* Global Toolbar Settings */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {/* Language Toggler */}
        <button
          onClick={() => setIsArabic(!isArabic)}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-bold shadow-xs cursor-pointer"
        >
          <Globe className="w-4 h-4" />
          <span>{isArabic ? "English" : "العربية"}</span>
        </button>

        {/* Dark Mode Toggler */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 space-y-8 relative z-10 transition-all duration-300">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-md transition-all duration-700 bg-${accentColor}-500 text-white`}
          >
            {activePortal === "ceo" ? <Shield className="w-7 h-7" /> : <User className="w-7 h-7" />}
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {currentT.title}
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {currentT.subtitle}
          </p>
        </div>

        {/* Custom Portals selector tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold relative">
          <button
            onClick={() => handlePortalChange("employee")}
            className={`py-3 rounded-xl transition-all cursor-pointer ${
              activePortal === "employee"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {currentT.employeeTab}
          </button>
          <button
            onClick={() => handlePortalChange("ceo")}
            className={`py-3 rounded-xl transition-all cursor-pointer ${
              activePortal === "ceo"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {currentT.ceoTab}
          </button>
        </div>

        {/* Portal-specific message */}
        <div className="text-center">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              activePortal === "ceo"
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
            }`}
          >
            {activePortal === "ceo" ? currentT.ceoWelcome : currentT.employeeWelcome}
          </span>
        </div>

        {/* Error alert box */}
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-450 text-xs font-semibold text-center animate-shake">
            {error}
          </div>
        )}

        {/* Main form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {currentT.emailLabel}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full py-3.5 pl-11 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 ${ringColorClass} transition-all`}
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {currentT.passwordLabel}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full py-3.5 pl-11 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 ${ringColorClass} transition-all`}
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Form Submit button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${btnColorClass}`}
          >
            {loading ? currentT.loadingText : currentT.loginButton}
          </button>
          
          <div className="relative flex items-center justify-center mt-6">
            <span className="absolute bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 font-semibold z-10">OR</span>
            <div className="w-full h-px bg-slate-200 dark:bg-slate-800 absolute top-1/2 transform -translate-y-1/2"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full py-3.5 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {currentT.googleLogin}
          </button>
        </form>

        {/* Demo Helper Banner */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[11px] text-slate-450 dark:text-slate-400 text-center leading-relaxed">
          <p className="font-bold mb-1">{currentT.demoCredentials}</p>
          <p className="font-mono">
            {activePortal === "ceo" ? "admin@mycompany.com / admin123" : "employee@mycompany.com / password123"}
          </p>
        </div>
      </div>
    </div>
  );
}
