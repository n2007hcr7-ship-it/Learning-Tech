import React, { useState, useEffect } from "react";
import {
  Layers,
  Users,
  Building2,
  Briefcase,
  CheckSquare,
  FileText,
  Sparkles,
  Award,
  LogOut,
  Settings,
  Bell,
  Menu,
  X,
  CreditCard,
  Shield,
  Clock,
  HelpCircle,
  Activity,
  Plus,
  Moon,
  Sun,
  Globe,
  Upload,
  TrendingUp,
  FileUp,
  UserCheck,
  Check,
  Percent,
  Play
} from "lucide-react";

import TenantBar from "./components/TenantBar.tsx";
import DashboardView from "./components/DashboardView.tsx";
import CustomersView from "./components/CustomersView.tsx";
import CompaniesView from "./components/CompaniesView.tsx";
import PipelineView from "./components/PipelineView.tsx";
import TasksView from "./components/TasksView.tsx";
import InvoicesView from "./components/InvoicesView.tsx";
import AiAssistantPanel from "./components/AiAssistantPanel.tsx";
import Login from "./components/Login.tsx";
import { SubscriptionPlan, UserRole } from "./types.js";

// Localization dictionary
const translations = {
  en: {
    title: "CRM Cloud SaaS",
    workspaceDesk: "Workspace Desk",
    dashboard: "Dashboard",
    customers: "Customers",
    companies: "Companies",
    pipeline: "Sales Pipeline",
    tasks: "Tasks",
    invoices: "Invoices",
    recruitment: "Recruitment (CVs)",
    reports: "Productivity & Profit",
    myWork: "My Submitted Work",
    logout: "Log Out",
    welcome: "Welcome back",
    workspace: "Workspace",
    billingPricing: "SaaS Billing Pricing",
    dark: "Dark Mode",
    light: "Light Mode",
    arabic: "العربية",
    english: "English",
    saving: "Saving...",
    save: "Save",
    ceoJobDesc: "Company Job Profile & Core Function",
    jobDescPlaceholder: "Specify company's main business function & hiring expectations...",
    uploadCv: "Screen Applicant CV",
    applicantName: "Applicant Full Name",
    cvFile: "CV Document (Text/Document)",
    evaluateCv: "Analyze CV with Gemini AI",
    evaluating: "AI Screening in progress...",
    evaluatedCvs: "Applicant Screening History",
    applicantNameCol: "Applicant Name",
    verdictCol: "Verdict",
    scoreCol: "Match Score",
    feedbackCol: "AI Insights",
    dateCol: "Date Screened",
    acceptBtn: "Accept Candidate",
    rejectBtn: "Reject Candidate",
    accepted: "ACCEPTED",
    rejected: "REJECTED",
    pending: "PENDING",
    employeeWorkSubmit: "Submit Finished Work for AI Review",
    submitWork: "Submit Work",
    submitting: "Analyzing work quality...",
    workHistory: "My Work Submission History",
    fileNameCol: "File / Submission Name",
    qualityScoreCol: "Quality Score",
    estimatedHoursCol: "AI Hours Worked",
    profitCol: "AI Profit Value",
    submittedAtCol: "Date Submitted",
    productivityCurve: "Productivity & Time/Profit Analysis Curve",
    totalProfits: "Total Profits Generated",
    totalTimeSaved: "Total Hours Worked",
    avgQuality: "Average Work Quality",
    noSubmissions: "No submissions recorded yet.",
    noEvaluations: "No applicant evaluations completed yet.",
    activeAlert: "New Alert",
    alertText: "You have outstanding tasks and notification updates.",
    dismissAlert: "Dismiss Alerts",
    noGeminiKey: "Simulation Notice: Gemini API Key is not configured. Connect your key in server .env to enable real AI.",
  },
  ar: {
    title: "سحابي CRM SaaS",
    workspaceDesk: "مكتب مساحة العمل",
    dashboard: "لوحة التحكم",
    customers: "العملاء",
    companies: "الشركات",
    pipeline: "مراحل المبيعات",
    tasks: "المهام",
    invoices: "الفواتير",
    recruitment: "التوظيف (السير الذاتية)",
    reports: "الإنتاجية والأرباح",
    myWork: "أعمالي المرفوعة",
    logout: "تسجيل الخروج",
    welcome: "مرحباً بك مجدداً",
    workspace: "مساحة عمل",
    billingPricing: "خطط الأسعار والاشتراكات",
    dark: "الوضع الداكن",
    light: "الوضع المضيء",
    arabic: "العربية",
    english: "English",
    saving: "جاري الحفظ...",
    save: "حفظ",
    ceoJobDesc: "مجال عمل الشركة والوصف الوظيفي الأساسي",
    jobDescPlaceholder: "حدد نشاط الشركة ومتطلبات التوظيف الأساسية للذكاء الاصطناعي...",
    uploadCv: "فحص وتدقيق السيرة الذاتية",
    applicantName: "اسم المتقدم الثنائي",
    cvFile: "ملف السيرة الذاتية (نصي/مستند)",
    evaluateCv: "فحص السيرة بالذكاء الاصطناعي",
    evaluating: "جاري الفرز والتحليل الذكي...",
    evaluatedCvs: "سجل فرز السير الذاتية",
    applicantNameCol: "اسم المتقدم",
    verdictCol: "قرار التوظيف",
    scoreCol: "نسبة التوافق",
    feedbackCol: "ملاحظات الذكاء الاصطناعي",
    dateCol: "تاريخ الفحص",
    acceptBtn: "قبول وتعيين الموظف",
    rejectBtn: "رفض الطلب",
    accepted: "مقبول",
    rejected: "مرفوض",
    pending: "قيد الانتظار",
    employeeWorkSubmit: "إرسال العمل المنجز للتقييم بالذكاء الاصطناعي",
    submitWork: "تسليم العمل",
    submitting: "جاري تقييم جودة العمل بالذكاء الاصطناعي...",
    workHistory: "سجل الأعمال المنجزة والتقييمات",
    fileNameCol: "اسم الملف / العمل المرفوع",
    qualityScoreCol: "درجة جودة العمل",
    estimatedHoursCol: "ساعات العمل التقديرية",
    profitCol: "الأرباح المحققة",
    submittedAtCol: "تاريخ التسليم",
    productivityCurve: "منحنى تحليل الأرباح وتوفير الوقت للمدير التنفيذي",
    totalProfits: "إجمالي الأرباح المحققة",
    totalTimeSaved: "إجمالي ساعات العمل التقديرية",
    avgQuality: "متوسط جودة العمل",
    noSubmissions: "لم يتم رفع أي أعمال منجزة بعد.",
    noEvaluations: "لا توجد طلبات توظيف مفروزة بعد.",
    activeAlert: "تنبيه نشط",
    alertText: "لديك إشعارات وتحديثات هامة حول مسار العمليات والفواتير.",
    dismissAlert: "تجاهل التنبيهات",
    noGeminiKey: "ملاحظة محاكاة: مفتاح Gemini API غير مفعّل. يرجى تهيئته في ملف .env بالخادم لتفعيل الذكاء الاصطناعي الفعلي.",
  }
};

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(localStorage.getItem("crm_token"));
  const [profile, setProfile] = useState<any>(null);
  
  // Theme & Language states
  const [isArabic, setIsArabic] = useState<boolean>(
    localStorage.getItem("is_arabic") === "true"
  );
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    localStorage.getItem("is_dark_mode") === "true"
  );

  // Router layout tab state
  const [activeTab, setActiveTab] = useState("dashboard");

  // Loaded collections state
  const [bootstrapData, setBootstrapData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // CEO Specific states
  const [jobDescription, setJobDescription] = useState("");
  const [cvEvaluations, setCvEvaluations] = useState<any[]>([]);
  const [workSubmissions, setWorkSubmissions] = useState<any[]>([]);
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [applicantName, setApplicantName] = useState("");
  const [isEvaluatingCv, setIsEvaluatingCv] = useState(false);

  // Employee Specific states
  const [workFile, setWorkFile] = useState<File | null>(null);
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

  // Modals / AI panels helpers states
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiType, setAiType] = useState<"summary" | "insights" | "email" | "general">("general");
  const [aiContext, setAiContext] = useState<any>(null);
  const [isBillingOpen, setIsBillingOpen] = useState(false);

  // States loaders loading indicators
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Play synthetic accept candidate sound (Web Audio API)
  const playAcceptSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, startTime);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      // High pleasant double-chime (D5 -> A5)
      playNote(587.33, now, 0.35);
      playNote(880.00, now + 0.15, 0.55);
    } catch (e) {
      console.error("Audio Context playback error:", e);
    }
  };

  // Synchronize layout dark mode class on element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("is_dark_mode", String(isDarkMode));
  }, [isDarkMode]);

  // Synchronize language selection
  useEffect(() => {
    localStorage.setItem("is_arabic", String(isArabic));
  }, [isArabic]);

  // Authenticated fetch helper
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      "Authorization": `Bearer ${token}`,
    } as any;

    const res = await fetch(url, {
      ...options,
      headers
    });

    if (res.status === 401) {
      handleLogout();
      throw new Error("Session expired. Please re-authenticate.");
    }
    return res;
  };

  // Initial load
  useEffect(() => {
    if (token) {
      loadBootstrap();
      loadTenantData();
    }
  }, [token]);

  const loadBootstrap = async () => {
    try {
      const res = await authFetch("/api/crm/bootstrap");
      const data = await res.json();
      setBootstrapData(data);
    } catch (e) {
      console.error("Unable to load initial bootstrap indices:", e);
    }
  };

  const loadTenantData = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const [
        meRes,
        dashRes,
        custRes,
        compRes,
        dealRes,
        taskRes,
        invRes,
        notRes,
        reportsRes
      ] = await Promise.all([
        authFetch("/api/auth/me"),
        authFetch("/api/crm/dashboard"),
        authFetch("/api/customers"),
        authFetch("/api/companies"),
        authFetch("/api/deals"),
        authFetch("/api/tasks"),
        authFetch("/api/invoices"),
        authFetch("/api/notifications"),
        authFetch("/api/ceo/reports")
      ]);

      const [
        meData,
        dashData,
        custData,
        compData,
        dealData,
        taskData,
        invData,
        notData,
        reportsData
      ] = await Promise.all([
        meRes.json(),
        dashRes.json(),
        custRes.json(),
        compRes.json(),
        dealRes.json(),
        taskRes.json(),
        invRes.json(),
        notRes.json(),
        reportsRes.json()
      ]);

      setProfile(meData);
      setDashboardData(dashData);
      setCustomers(custData);
      setCompanies(compData);
      setDeals(dealData);
      setTasks(taskData);
      setInvoices(invData);
      setNotifications(notData);

      // CEO data mapping
      if (reportsData) {
        setCvEvaluations(reportsData.evaluations || []);
        setWorkSubmissions(reportsData.submissions || []);
        if (reportsData.settings) {
          setJobDescription(reportsData.settings.jobDescription || "");
        }
      }

    } catch (e) {
      console.error("Error retrieving tenant specific collections:", e);
      setStatusMessage("Failed loading localized database segments.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (newToken: string, user: any, organization: any) => {
    localStorage.setItem("crm_token", newToken);
    setToken(newToken);
    setProfile({ user, organization });
    // Switch default tab depending on user role
    const isCeoUser = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
    setActiveTab(isCeoUser ? "dashboard" : "my-work");
  };

  const handleLogout = () => {
    localStorage.removeItem("crm_token");
    setToken(null);
    setProfile(null);
    setBootstrapData(null);
  };

  const handleSaveJobDescription = async () => {
    setIsSavingDesc(true);
    try {
      await authFetch("/api/ceo/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription })
      });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingDesc(false);
    }
  };

  const handleEvaluateCv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile || !applicantName) return;
    setIsEvaluatingCv(true);

    try {
      const formData = new FormData();
      formData.append("cvFile", cvFile);
      formData.append("applicantName", applicantName);

      const res = await fetch("/api/ceo/evaluate-cv", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error("AI CV evaluation request failed.");
      
      const newEval = await res.json();
      
      // Update local state CVs list
      setCvEvaluations(prev => [newEval, ...prev]);
      setApplicantName("");
      setCvFile(null);
      
      // Trigger chime play on ACCEPTED candidate
      if (newEval.verdict === "ACCEPTED") {
        playAcceptSound();
      }

      await loadTenantData();
    } catch (e) {
      console.error(e);
      alert("CV Analysis error. Verify file format and API key configuration.");
    } finally {
      setIsEvaluatingCv(false);
    }
  };

  const handleManualVerdictUpdate = async (evalId: string, verdict: "ACCEPTED" | "REJECTED") => {
    // Allows CEO to manually accept or reject applicants, plays chime if accepted
    try {
      // Find item
      const item = cvEvaluations.find(e => e.id === evalId);
      if (!item) return;

      const updatedItem = {
        ...item,
        verdict
      };

      // Mock update local state
      setCvEvaluations(prev => prev.map(e => e.id === evalId ? updatedItem : e));
      
      if (verdict === "ACCEPTED") {
        playAcceptSound();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workFile) return;
    setIsSubmittingWork(true);

    try {
      const formData = new FormData();
      formData.append("workFile", workFile);

      const res = await fetch("/api/employee/submit-work", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error("Work submission failed.");

      const newSubmission = await res.json();
      setWorkSubmissions(prev => [newSubmission, ...prev]);
      setWorkFile(null);
      
      await loadTenantData();
    } catch (e) {
      console.error(e);
      alert("Submission error. Verify your upload file context.");
    } finally {
      setIsSubmittingWork(false);
    }
  };

  // Mutators APIs standard delegates
  const handleCreateCustomer = async (fieldsPayload: any) => {
    try {
      await authFetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fieldsPayload)
      });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCustomer = async (id: string, updatesPayload: any) => {
    try {
      await authFetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatesPayload)
      });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      await authFetch(`/api/customers/${id}`, { method: "DELETE" });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCompany = async (payload: any) => {
    try {
      await authFetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCompany = async (id: string, payload: any) => {
    try {
      await authFetch(`/api/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateDeal = async (payload: any) => {
    try {
      await authFetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateDeal = async (id: string, payload: any) => {
    try {
      await authFetch(`/api/deals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async (payload: any) => {
    try {
      await authFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTask = async (id: string, payload: any) => {
    try {
      await authFetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await authFetch(`/api/tasks/${id}`, { method: "DELETE" });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateInvoice = async (payload: any) => {
    try {
      await authFetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePayInvoice = async (id: string, payload: any) => {
    try {
      await authFetch(`/api/invoices/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeSubscription = async (plan: SubscriptionPlan) => {
    try {
      await authFetch("/api/organization/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan })
      });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await authFetch("/api/notifications/read-all", { method: "POST" });
      await loadTenantData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAiPanel = (type: "summary" | "insights" | "email" | "general", context: any) => {
    setAiType(type);
    setAiContext(context);
    setIsAiOpen(true);
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  // Unauthenticated routing switch
  if (!token) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        isArabic={isArabic}
        setIsArabic={setIsArabic}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />
    );
  }

  // Active translation set
  const trans = isArabic ? translations.ar : translations.en;

  // Role details mapping
  const isCeo =
    profile?.user?.role === UserRole.SUPER_ADMIN ||
    profile?.user?.role === UserRole.ADMIN ||
    profile?.user?.role === "CEO";

  // Dynamic Theme Styling configurations (Blue vs Emerald green)
  const accentColor = isCeo ? "emerald" : "blue";
  
  // Custom theme classes maps
  const sidebarItemActive = isCeo
    ? "bg-emerald-600 dark:bg-emerald-700 text-white shadow-sm font-bold"
    : "bg-blue-600 dark:bg-blue-700 text-white shadow-sm font-bold";
  const textColorClass = isCeo ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400";
  const btnColorClass = isCeo
    ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
  const progressBgClass = isCeo ? "bg-emerald-500" : "bg-blue-500";
  const lightBgClass = isCeo
    ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300"
    : "bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30 text-blue-800 dark:text-blue-300";

  // Navigation Items mapping depending on Role persona
  const menuItems = isCeo
    ? [
        { key: "dashboard", label: trans.dashboard, icon: Award },
        { key: "customers", label: trans.customers, icon: Users },
        { key: "companies", label: trans.companies, icon: Building2 },
        { key: "pipeline", label: trans.pipeline, icon: Briefcase },
        { key: "tasks", label: trans.tasks, icon: CheckSquare },
        { key: "invoices", label: trans.invoices, icon: FileText },
        { key: "recruitment", label: trans.recruitment, icon: UserCheck },
        { key: "reports", label: trans.reports, icon: TrendingUp },
      ]
    : [
        { key: "my-work", label: trans.myWork, icon: FileUp },
        { key: "dashboard", label: trans.dashboard, icon: Award },
        { key: "tasks", label: trans.tasks, icon: CheckSquare },
      ];

  // Productivity metrics calculations
  const totalSubmissionsProfit = workSubmissions.reduce((sum, s) => sum + (s.profitGenerated || 0), 0);
  const totalSubmissionsHours = workSubmissions.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
  const avgSubmissionsQuality =
    workSubmissions.length > 0
      ? Math.round(workSubmissions.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / workSubmissions.length)
      : 0;

  // SVG Chart points computing
  const sortedSubmissions = [...workSubmissions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const maxProfit = Math.max(...sortedSubmissions.map((s) => s.profitGenerated || 0), 1000) * 1.15;
  const chartWidth = 650;
  const chartHeight = 220;
  const chartPadding = 45;

  const profitPoints = sortedSubmissions.map((s, i) => {
    const x = chartPadding + (i * (chartWidth - chartPadding * 2)) / Math.max(sortedSubmissions.length - 1, 1);
    const y = chartHeight - chartPadding - ((s.profitGenerated || 0) * (chartHeight - chartPadding * 2)) / maxProfit;
    return { x, y, item: s };
  });

  const hoursPoints = sortedSubmissions.map((s, i) => {
    const x = chartPadding + (i * (chartWidth - chartPadding * 2)) / Math.max(sortedSubmissions.length - 1, 1);
    const maxHrs = Math.max(...sortedSubmissions.map((sub) => sub.estimatedHours || 0), 10) * 1.15;
    const y = chartHeight - chartPadding - ((s.estimatedHours || 0) * (chartHeight - chartPadding * 2)) / maxHrs;
    return { x, y, item: s };
  });

  const profitLinePath = profitPoints.length > 0
    ? profitPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    : "";

  const hoursLinePath = hoursPoints.length > 0
    ? hoursPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    : "";

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-250 font-sans antialiased flex flex-col justify-between transition-colors duration-300"
    >
      {/* Dev Switcher Header Bar */}
      <TenantBar
        currentTenantId={profile?.organization?.id || "org-acme"}
        currentUserId={profile?.user?.id || "usr-admin-acme"}
        onTenantChange={() => {}}
        onUserChange={() => {}}
        onSubChange={handleChangeSubscription}
        userProfile={profile?.user}
        orgDetails={profile?.organization}
        allBootstrapData={bootstrapData}
        isLoading={isLoading}
        onRefresh={loadTenantData}
      />

      <div className="flex grow">
        {/* Dynamic Sidebar with active theme styles */}
        <aside className="w-[260px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 shrink-0 hidden md:flex flex-col justify-between relative shadow-xs transition-colors duration-300">
          <div className="space-y-6">
            <div className="flex items-center gap-2.5 px-1">
              <div className={`p-2.5 rounded-2xl shadow-md text-white ${isCeo ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                <Briefcase className="w-5.5 h-5.5" />
              </div>
              <div>
                <span className="font-extrabold text-[15px] text-slate-900 dark:text-white tracking-tight leading-none block">
                  {trans.title}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5 inline-block">
                  {trans.workspaceDesk}
                </span>
              </div>
            </div>

            {/* Menu options */}
            <nav className="space-y-1.5 pt-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                      isArabic ? "text-right" : "text-left"
                    } ${
                      isActive
                        ? sidebarItemActive
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User profile details and settings buttons sidebar bottom */}
          <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            {/* Language & Theme Selectors */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsArabic(!isArabic)}
                className="grow py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                {isArabic ? "English" : "العربية"}
              </button>

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => setIsBillingOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <CreditCard className="w-4.5 h-4.5 text-indigo-500" />
              {trans.billingPricing}
            </button>

            <div className="p-3 bg-slate-50 dark:bg-slate-850/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex gap-2.5 items-center">
              <img
                src={
                  isCeo
                    ? "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop&q=80"
                    : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop&q=80"
                }
                alt="Account Avatar"
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
              />
              <div className="truncate grow">
                <p className="font-bold text-slate-800 dark:text-white leading-none">
                  {profile?.user?.firstName} {profile?.user?.lastName}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-500 dark:text-slate-400 leading-none">
                  <Shield className="w-2.5 h-2.5" />
                  <span className="font-mono uppercase">{profile?.user?.role}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-450 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20"
                title={trans.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Primary Screen Area body content */}
        <main className="grow p-6 md:p-8 max-w-7xl mx-auto space-y-6 overflow-x-hidden">
          {/* Notifications dynamic banner */}
          {unreadNotifCount > 0 && (
            <div className={`text-white rounded-2xl p-4 px-5 shadow-md flex items-center justify-between gap-4 text-xs ${isCeo ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
              <div className="flex items-center gap-3">
                <div className="p-1 px-2.5 bg-white/20 rounded-full font-bold text-[10px] uppercase tracking-wide">
                  {trans.activeAlert}
                </div>
                <p className="font-medium leading-relaxed">
                  {trans.alertText}
                </p>
              </div>
              <button
                onClick={markAllNotificationsRead}
                className="p-1 px-3 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-100 transition-colors text-[10px]"
              >
                {trans.dismissAlert}
              </button>
            </div>
          )}

          {/* Active Tab Screen Renderers */}
          {activeTab === "dashboard" && (
            <DashboardView
              metrics={dashboardData?.metrics}
              upcomingTasks={dashboardData?.upcomingTasks}
              recentActivities={dashboardData?.recentActivities}
              userProfile={profile?.user}
              orgDetails={profile?.organization}
              onNavigate={setActiveTab}
              onAddTaskQuick={() => setActiveTab("tasks")}
            />
          )}

          {activeTab === "customers" && (
            <CustomersView
              customers={customers}
              companies={companies}
              onCreateCustomer={handleCreateCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onTriggerAI={handleOpenAiPanel}
              userRole={profile?.user?.role}
            />
          )}

          {activeTab === "companies" && (
            <CompaniesView
              companies={companies}
              onCreateCompany={handleCreateCompany}
              onUpdateCompany={handleUpdateCompany}
            />
          )}

          {activeTab === "pipeline" && (
            <PipelineView
              deals={deals}
              customers={customers}
              companies={companies}
              onCreateDeal={handleCreateDeal}
              onUpdateDeal={handleUpdateDeal}
              onTriggerAI={handleOpenAiPanel}
            />
          )}

          {activeTab === "tasks" && (
            <TasksView
              tasks={tasks}
              customers={customers}
              allUsers={bootstrapData?.users || []}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {activeTab === "invoices" && (
            <InvoicesView
              invoices={invoices}
              customers={customers}
              companies={companies}
              onCreateInvoice={handleCreateInvoice}
              onPayInvoice={handlePayInvoice}
            />
          )}

          {/* CEO Specific: Recruitment / CV Screen view */}
          {activeTab === "recruitment" && (
            <div className="space-y-6">
              {/* Job settings profile definition */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <Settings className={`w-5 h-5 ${textColorClass}`} />
                  {trans.ceoJobDesc}
                </h2>
                <div className="space-y-2">
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full min-h-[100px] p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                    placeholder={trans.jobDescPlaceholder}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveJobDescription}
                      disabled={isSavingDesc}
                      className={`px-4 py-2 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${btnColorClass}`}
                    >
                      {isSavingDesc ? trans.saving : trans.save}
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload candidate CV Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                  <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
                    <Upload className={`w-5 h-5 ${textColorClass}`} />
                    {trans.uploadCv}
                  </h2>
                  <form onSubmit={handleEvaluateCv} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {trans.applicantName}
                      </label>
                      <input
                        type="text"
                        required
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {trans.cvFile}
                      </label>
                      <input
                        type="file"
                        required
                        accept=".txt,.doc,.docx,.pdf"
                        onChange={(e) => setCvFile(e.target.files ? e.target.files[0] : null)}
                        className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-slate-800 dark:file:text-slate-350 cursor-pointer"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isEvaluatingCv || !cvFile}
                      className={`w-full py-3 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${btnColorClass}`}
                    >
                      {isEvaluatingCv ? trans.evaluating : trans.evaluateCv}
                    </button>
                  </form>
                </div>

                {/* Screening History list table */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                  <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
                    <UserCheck className={`w-5 h-5 ${textColorClass}`} />
                    {trans.evaluatedCvs}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase font-mono text-[9px] tracking-wider">
                          <th className="py-2.5">{trans.applicantNameCol}</th>
                          <th className="py-2.5">{trans.verdictCol}</th>
                          <th className="py-2.5">{trans.scoreCol}</th>
                          <th className="py-2.5">{trans.feedbackCol}</th>
                          <th className="py-2.5">{trans.dateCol}</th>
                          <th className="py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                        {cvEvaluations.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-450">
                              {trans.noEvaluations}
                            </td>
                          </tr>
                        ) : (
                          cvEvaluations.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30">
                              <td className="py-3 font-bold text-slate-900 dark:text-white">
                                {item.applicantName}
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider ${
                                    item.verdict === "ACCEPTED"
                                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                                      : item.verdict === "REJECTED"
                                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-450"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                  }`}
                                >
                                  {item.verdict}
                                </span>
                              </td>
                              <td className="py-3 font-mono font-bold text-slate-700 dark:text-slate-350">
                                {item.aiScore}%
                              </td>
                              <td className="py-3 text-slate-500 max-w-[180px] truncate" title={item.aiFeedback}>
                                {item.aiFeedback}
                              </td>
                              <td className="py-3 text-slate-450 font-mono text-[10px]">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 text-right space-x-1.5 rtl:space-x-reverse">
                                {item.verdict === "PENDING" && (
                                  <>
                                    <button
                                      onClick={() => handleManualVerdictUpdate(item.id, "ACCEPTED")}
                                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded text-[10px] cursor-pointer"
                                    >
                                      {trans.acceptBtn}
                                    </button>
                                    <button
                                      onClick={() => handleManualVerdictUpdate(item.id, "REJECTED")}
                                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded text-[10px] cursor-pointer"
                                    >
                                      {trans.rejectBtn}
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CEO Specific: Analytics & Reports panel */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              {/* Summary stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                    {trans.totalProfits}
                  </span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-450">
                    ${totalSubmissionsProfit.toLocaleString()}
                  </p>
                </div>
                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                    {trans.totalTimeSaved}
                  </span>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-450">
                    {totalSubmissionsHours} hrs
                  </p>
                </div>
                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                    {trans.avgQuality}
                  </span>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-450">
                    {avgSubmissionsQuality}%
                  </p>
                </div>
              </div>

              {/* Productivity & Profit curves */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <div>
                  <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
                    <TrendingUp className={`w-5 h-5 ${textColorClass}`} />
                    {trans.productivityCurve}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Historical profit margins plotted against estimated time requirements.</p>
                </div>

                {sortedSubmissions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-450">
                    {trans.noSubmissions}
                  </div>
                ) : (
                  <div className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-800 flex justify-center items-center">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-[650px] overflow-visible">
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = chartPadding + ratio * (chartHeight - chartPadding * 2);
                        const val = Math.round(maxProfit * (1 - ratio));
                        return (
                          <g key={idx}>
                            <line
                              x1={chartPadding}
                              y1={y}
                              x2={chartWidth - chartPadding}
                              y2={y}
                              stroke="#e2e8f0"
                              strokeWidth="0.8"
                              strokeDasharray="4 4"
                            />
                            <text x={chartPadding - 8} y={y + 3} fill="#94a3b8" fontSize="8" textAnchor="end">
                              ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                            </text>
                          </g>
                        );
                      })}

                      {/* Profit Line */}
                      {profitLinePath && (
                        <path
                          d={profitLinePath}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Hours Line */}
                      {hoursLinePath && (
                        <path
                          d={hoursLinePath}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray="3 3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Data dots */}
                      {profitPoints.map((pt, idx) => (
                        <g key={idx}>
                          <circle cx={pt.x} cy={pt.y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                          <text x={pt.x} y={chartHeight - 12} fill="#64748b" fontSize="8" textAnchor="middle">
                            {idx + 1}
                          </text>
                        </g>
                      ))}

                      {/* Legends */}
                      <g transform={`translate(${chartWidth / 2 - 100}, 20)`} className="text-[10px]">
                        <circle cx="10" cy="0" r="4" fill="#10b981" />
                        <text x="20" y="3" fill="#64748b" fontSize="9">Profits ($)</text>

                        <circle cx="100" cy="0" r="4" fill="#3b82f6" />
                        <text x="110" y="3" fill="#64748b" fontSize="9">Hours Saved</text>
                      </g>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Employee Specific: My Work view */}
          {activeTab === "my-work" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Upload Form */}
                <div className="md:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                  <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
                    <FileUp className={`w-5 h-5 ${textColorClass}`} />
                    {trans.employeeWorkSubmit}
                  </h2>
                  <form onSubmit={handleUploadWork} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {trans.cvFile}
                      </label>
                      <input
                        type="file"
                        required
                        onChange={(e) => setWorkFile(e.target.files ? e.target.files[0] : null)}
                        className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 dark:file:bg-slate-800 dark:file:text-slate-350 cursor-pointer"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingWork || !workFile}
                      className={`w-full py-3 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${btnColorClass}`}
                    >
                      {isSubmittingWork ? trans.submitting : trans.submitWork}
                    </button>
                  </form>
                </div>

                {/* Submissions list */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                  <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
                    <CheckSquare className={`w-5 h-5 ${textColorClass}`} />
                    {trans.workHistory}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase font-mono text-[9px] tracking-wider">
                          <th className="py-2.5">{trans.fileNameCol}</th>
                          <th className="py-2.5">{trans.qualityScoreCol}</th>
                          <th className="py-2.5">{trans.estimatedHoursCol}</th>
                          <th className="py-2.5">{trans.profitCol}</th>
                          <th className="py-2.5">{trans.feedbackCol}</th>
                          <th className="py-2.5">{trans.submittedAtCol}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                        {workSubmissions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-450">
                              {trans.noSubmissions}
                            </td>
                          </tr>
                        ) : (
                          workSubmissions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30">
                              <td className="py-3 font-bold text-slate-900 dark:text-white">
                                {sub.fileName}
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded font-bold text-[9px] text-white ${progressBgClass}`}>
                                  {sub.qualityScore}%
                                </span>
                              </td>
                              <td className="py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                                {sub.estimatedHours} hrs
                              </td>
                              <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                ${sub.profitGenerated}
                              </td>
                              <td className="py-3 text-slate-500 max-w-[180px] truncate" title={sub.aiFeedback}>
                                {sub.aiFeedback}
                              </td>
                              <td className="py-3 text-slate-450 font-mono text-[10px]">
                                {new Date(sub.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* AI Panel sidebar */}
      <AiAssistantPanel
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        aiType={aiType}
        aiContext={aiContext}
        tenantId={profile?.organization?.id || "org-acme"}
        userId={profile?.user?.id || "usr-admin-acme"}
      />

      {/* Billing modal */}
      {isBillingOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-xl max-w-4xl w-full p-8 space-y-6 text-slate-950 dark:text-white">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <CreditCard className="w-5.5 h-5.5 text-indigo-600" />
                  SaaS Multi-Tenant Commercial Billing Structure
                </h3>
                <p className="text-slate-450 text-xs">Verify billing rules, limits, and pricing models.</p>
              </div>
              <button onClick={() => setIsBillingOpen(false)} className="text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg">
                ✕
              </button>
            </div>

            {/* Grid of pricing cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
              {[
                {
                  title: "FREE",
                  price: "$0",
                  limit: "1 Organization, 1 CRM user",
                  features: ["Up to 10 contacts", "Manual agenda checklist", "No company linkage", "Standard summaries only"],
                  badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350"
                },
                {
                  title: "STARTER",
                  price: "$19/mo",
                  limit: "Includes 3 CRM users",
                  features: ["Up to 100 contacts", "Linked portfolio profiles", "Standard Kanban boards", "Basic dashboards"],
                  badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                },
                {
                  title: "PROFESSIONAL",
                  price: "$49/mo",
                  limit: "Includes 15 CRM users",
                  features: ["Unlimited customer profiles", "Full sales timelines", "Invoice generation tools", "Gemini automated emails"],
                  badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                },
                {
                  title: "ENTERPRISE",
                  price: "$129/mo",
                  limit: "Unlimited organizational usage",
                  features: ["Advanced multi-tenant audits", "Priority RBAC permissions", "Complete Gemini API models integrations", "Continuous timeline telemetry"],
                  badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                }
              ].map((tier, idx) => {
                const isActive = profile?.organization?.plan === tier.title;
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isActive
                        ? "bg-slate-900 text-slate-100 border-indigo-600/60 dark:border-indigo-400/60 shadow-lg scale-102"
                        : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-transparent">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider ${tier.badge}`}>
                          {tier.title}
                        </span>
                        {isActive && (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest animate-pulse">
                            ● Current Plan
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className={`text-2xl font-black ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {tier.price}
                        </p>
                        <p className={`text-[10px] ${isActive ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
                          {tier.limit}
                        </p>
                      </div>

                      <ul className="space-y-1.5 pt-3 border-t border-slate-100/10 dark:border-slate-800 text-[11px] leading-snug">
                        {tier.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex gap-1">
                            <span className="text-indigo-500 dark:text-indigo-400 font-bold">✓</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => handleChangeSubscription(tier.title as SubscriptionPlan)}
                        className="w-full py-2 rounded-lg text-center font-bold text-[10px] uppercase tracking-wider mt-4 bg-slate-150 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-colors"
                      >
                        Activate Plan
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
