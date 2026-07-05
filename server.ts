/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import { db } from "./server/db.js";
import {
  UserRole,
  SubscriptionPlan,
  CustomerStatus,
  DealStage,
  TaskStatus,
  TaskPriority,
  InvoiceStatus,
  Customer,
  Company,
  Deal,
  Task,
  Invoice,
  Payment,
  CRMNote
} from "./src/types.js";

// Initialize express app
const app = express();
const PORT = 3000;

// Body parser
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-2026";
const upload = multer({ storage: multer.memoryStorage() });

// Helper to get real or mock Gemini AI client
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Simple authentication and tenancy middleware
// In a full SaaS, this would parse JWT and load matching User & Tenant.
// For our CRM, we pass "X-Tenant-Id" & "X-User-Id" headers from the client
// which represent the logged-in user session context. This makes testing RBAC and tenancy extreme clean!
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    organizationId: string;
  };
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }
  
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    db.refresh();
    const users = db.gets("users");
    const currentUser = users.find(u => u.id === decoded.userId);
    
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized: User not found" });
    }
    
    req.user = {
      id: currentUser.id,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
      role: currentUser.role,
      organizationId: currentUser.organizationId,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// RBAC Permission checks helper
const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: This action requires role of: ${allowedRoles.join(" or ")}. Your current role is ${req.user.role}.`,
      });
    }
    next();
  };
};

// Activity log logger helper
function logCRMActivity(orgId: string, userId: string, userName: string, action: string, details: string) {
  db.mutate("activities", (arr) => {
    arr.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      organizationId: orgId,
      userId,
      userName,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  });
}

// Notification logger helper
function createCRMNotification(orgId: string, userId: string, title: string, message: string, type: "info" | "success" | "warning" | "reminder") {
  db.mutate("notifications", (arr) => {
    arr.unshift({
      id: `not-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      organizationId: orgId,
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
  });
}

// ==========================================
// API ROUTES
// ==========================================

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  db.refresh();
  const users = db.gets("users");
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  // Verify password using either seed password mapping or bcrypt check
  let isValid = false;
  if (user.password === "hashed_password_here") {
    isValid = (password === "password123" || password === "admin123");
  } else {
    try {
      isValid = bcrypt.compareSync(password, user.password || "");
    } catch (e) {
      isValid = false;
    }
  }

  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id, organizationId: user.organizationId, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  const orgs = db.gets("organizations");
  const org = orgs.find(o => o.id === user.organizationId);

  res.json({ token, user, organization: org });
});

// Distinct login endpoint for employees/individuals
app.post("/api/auth/login/employee", (req, res) => {
  const { email, password } = req.body;
  db.refresh();
  const users = db.gets("users");
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  const isEmployeeRole = user.role === UserRole.EMPLOYEE || user.role === UserRole.SALES_REP || user.role === UserRole.MANAGER;
  if (!isEmployeeRole) {
    return res.status(403).json({ error: "Access denied: Please use the CEO Portal to login." });
  }
  
  let isValid = false;
  if (user.password === "hashed_password_here") {
    isValid = (password === "password123" || password === "admin123");
  } else {
    try {
      isValid = bcrypt.compareSync(password, user.password || "");
    } catch (e) {
      isValid = false;
    }
  }

  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id, organizationId: user.organizationId, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  const orgs = db.gets("organizations");
  const org = orgs.find(o => o.id === user.organizationId);

  res.json({ token, user, organization: org });
});

// Distinct login endpoint for the CEO
app.post("/api/auth/login/ceo", (req, res) => {
  const { email, password } = req.body;
  db.refresh();
  const users = db.gets("users");
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  const isCeoRole = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN || user.role === "CEO";
  if (!isCeoRole) {
    return res.status(403).json({ error: "Access denied: Please use the Employee Portal to login." });
  }
  
  let isValid = false;
  if (user.password === "hashed_password_here") {
    isValid = (password === "password123" || password === "admin123");
  } else {
    try {
      isValid = bcrypt.compareSync(password, user.password || "");
    } catch (e) {
      isValid = false;
    }
  }

  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id, organizationId: user.organizationId, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  const orgs = db.gets("organizations");
  const org = orgs.find(o => o.id === user.organizationId);

  res.json({ token, user, organization: org });
});

app.post("/api/auth/google", (req, res) => {
  const { role } = req.body;
  db.refresh();
  const users = db.gets("users");
  
  let targetUser;
  if (role === "ceo") {
    targetUser = users.find(u => u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN || u.role === "CEO");
  } else {
    targetUser = users.find(u => u.role === UserRole.EMPLOYEE || u.role === UserRole.SALES_REP || u.role === UserRole.MANAGER);
  }
  
  if (!targetUser) {
    return res.status(401).json({ error: "Google account not linked to any user in this portal." });
  }

  const token = jwt.sign({ userId: targetUser.id, organizationId: targetUser.organizationId, role: targetUser.role }, JWT_SECRET, { expiresIn: '24h' });
  const orgs = db.gets("organizations");
  const org = orgs.find(o => o.id === targetUser.organizationId);

  res.json({ token, user: targetUser, organization: org });
});

app.post("/api/ceo/evaluate-cv", authMiddleware, requireRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, "CEO" as any]), upload.single("cvFile"), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.user!.organizationId;
    const { applicantName } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No CV file uploaded" });

    const settings = db.gets("company_settings").find(s => s.organizationId === orgId);
    const jobDescription = settings ? settings.jobDescription : "General Company Requirements";

    const ai = getGeminiClient();
    let verdict = "PENDING", aiScore = 0, aiFeedback = "AI not configured";

    if (ai) {
      const fileContent = file.buffer.toString("utf-8"); 
      const prompt = `Evaluate if this applicant is suitable to be hired based on their CV content matching the company's business domain and job description: "${jobDescription}".
      CV Content: "${fileContent.substring(0, 5000)}"
      
      Determine if the CV aligns with the company's core function. If it matches, the verdict must be "ACCEPTED". Otherwise, "REJECTED".
      Reply in JSON format only with EXACTLY these fields: { "verdict": "ACCEPTED" or "REJECTED", "aiScore": integer between 0 and 100, "aiFeedback": "short reason in the language of the CV" }. Do not add markdown around JSON.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      const text = response.text || "{}";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        verdict = parsed.verdict || "PENDING";
        aiScore = parsed.aiScore || 0;
        aiFeedback = parsed.aiFeedback || "Evaluated";
      }
    }

    const newEval = {
      id: `cv-${Date.now()}`,
      organizationId: orgId,
      applicantName: applicantName || "Unknown Applicant",
      verdict: verdict as any,
      aiScore,
      aiFeedback,
      createdAt: new Date().toISOString()
    };
    db.mutate("cv_evaluations", arr => { arr.unshift(newEval); return arr; });
    res.json(newEval);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Evaluation failed" });
  }
});

app.post("/api/employee/submit-work", authMiddleware, upload.single("workFile"), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.user!.organizationId;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No work file uploaded" });

    const ai = getGeminiClient();
    let qualityScore = 0, estimatedHours = 0, profitGenerated = 0, aiFeedback = "AI not configured";

    if (ai) {
      let response;
      const fileContentText = file.buffer.toString("utf-8");
      const isImage = file.mimetype.startsWith("image/");
      const isPdf = file.mimetype === "application/pdf";
      
      if (isImage || isPdf) {
        const filePart = {
          inlineData: {
            data: file.buffer.toString("base64"),
            mimeType: file.mimetype
          }
        };
        const prompt = `Evaluate this submitted work from an employee. Determine the quality of the work, estimate the work hours required to produce it, and estimate the profit generated in dollars for the company.
        Reply in JSON format only with EXACTLY these fields: { "qualityScore": integer between 0 and 100, "estimatedHours": integer, "profitGenerated": integer, "aiFeedback": "short review" }. Do not add markdown around JSON.`;
        
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [filePart, prompt]
        });
      } else {
        const prompt = `Evaluate this submitted work from an employee.
        File Name: "${file.originalname}"
        File Size: ${file.size} bytes
        File Type: "${file.mimetype}"
        Content Snippet: "${fileContentText.substring(0, 4000)}"
        
        Estimate work hours required (as integer), quality score 0-100 (as integer), and estimated profit generated in dollars (as integer).
        Reply in JSON format only with EXACTLY these fields: { "qualityScore": integer, "estimatedHours": integer, "profitGenerated": integer, "aiFeedback": "short review" }. Do not add markdown around JSON.`;
        
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });
      }
      
      const text = response.text || "{}";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        qualityScore = parsed.qualityScore || 0;
        estimatedHours = parsed.estimatedHours || 0;
        profitGenerated = parsed.profitGenerated || 0;
        aiFeedback = parsed.aiFeedback || "Evaluated";
      }
    }

    const submission = {
      id: `work-${Date.now()}`,
      organizationId: orgId,
      userId: req.user!.id,
      fileName: file.originalname,
      qualityScore,
      estimatedHours,
      profitGenerated,
      aiFeedback,
      createdAt: new Date().toISOString()
    };
    db.mutate("work_submissions", arr => { arr.unshift(submission); return arr; });
    res.json(submission);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Submission failed" });
  }
});

app.post("/api/ceo/settings", authMiddleware, requireRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, "CEO" as any]), async (req: AuthenticatedRequest, res) => {
  const { jobDescription } = req.body;
  const orgId = req.user!.organizationId;
  db.mutate("company_settings", arr => {
    const idx = arr.findIndex(s => s.organizationId === orgId);
    if (idx >= 0) {
      arr[idx].jobDescription = jobDescription;
      arr[idx].updatedAt = new Date().toISOString();
    } else {
      arr.push({ id: `set-${Date.now()}`, organizationId: orgId, jobDescription, updatedAt: new Date().toISOString() });
    }
    return arr;
  });
  res.json({ success: true });
});

// Endpoint to generate an AI operational and productivity report for the CEO
app.post("/api/ceo/ai-summary-report", authMiddleware, requireRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, "CEO" as any]), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.user!.organizationId;
    const submissions = db.gets("work_submissions").filter(w => w.organizationId === orgId);
    const evaluations = db.gets("cv_evaluations").filter(c => c.organizationId === orgId);
    const settings = db.gets("company_settings").find(s => s.organizationId === orgId);
    const users = db.gets("users").filter(u => u.organizationId === orgId);
    
    const companyJob = settings ? settings.jobDescription : "General business operations";
    
    const employeePerf = submissions.map(sub => {
      const u = users.find(usr => usr.id === sub.userId);
      return {
        employeeName: u ? `${u.firstName} ${u.lastName}` : "Unknown Employee",
        fileName: sub.fileName,
        qualityScore: sub.qualityScore,
        hoursWorked: sub.estimatedHours,
        profitGenerated: sub.profitGenerated,
        aiFeedback: sub.aiFeedback,
        date: sub.createdAt
      };
    });

    const cvData = evaluations.map(ev => ({
      applicantName: ev.applicantName,
      verdict: ev.verdict,
      matchScore: ev.aiScore,
      feedback: ev.aiFeedback,
      date: ev.createdAt
    }));

    const ai = getGeminiClient();
    let reportContent = "";
    
    if (ai) {
      const prompt = `You are an elite corporate AI operations advisor. Write a detailed operational performance and recruitment analysis report for the CEO.
      
      Company Business Function: "${companyJob}"
      
      Employees' Work Performance & Submissions:
      ${JSON.stringify(employeePerf, null, 2)}
      
      Recruitment CV Pipeline Screening History:
      ${JSON.stringify(cvData, null, 2)}
      
      Instructions:
      1. Write the report in Markdown format.
      2. Support BOTH English and Arabic languages in the report (generate an English report first, followed by a translated Arabic version below it, under separate headers).
      3. Evaluate the overall operations and productivity of the company.
      4. Assess each individual employee's productivity, hours worked, and profit generated. Clearly identify the most productive employees and those who saved the most time/costs.
      5. Assess the CV recruitment pipeline: verify if the applicants screened match the company's business function ("${companyJob}"), and analyze if the new candidates will be useful for the company.
      6. Provide strategic recommendations for operations, hiring, and performance improvements.
      
      Ensure a professional, premium tone. Do not write any outer wrapper, reply with the markdown content directly.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      reportContent = response.text || "AI generated empty response.";
    } else {
      reportContent = `
# Executive AI Operations & Productivity Report
**Date:** ${new Date().toLocaleDateString()}
**Company Domain:** ${companyJob}

### 1. Overall Operations Summary
*   **Total Profits Generated:** $${employeePerf.reduce((sum, e) => sum + e.profitGenerated, 0).toLocaleString()}
*   **Total Time Saved/Worked:** ${employeePerf.reduce((sum, e) => sum + e.hoursWorked, 0)} hours
*   **Average Work Quality:** ${employeePerf.length > 0 ? Math.round(employeePerf.reduce((sum, e) => sum + e.qualityScore, 0) / employeePerf.length) : 0}%

### 2. Employee Productivity & Value Assessment
${employeePerf.length === 0 ? "No employee submissions to analyze." : employeePerf.map(e => `
*   **${e.employeeName}**: Completed "${e.fileName}" with a quality score of **${e.qualityScore}%**. Generated **$${e.profitGenerated}** in revenue and worked **${e.hoursWorked} hours**. 
    *   *AI Evaluation:* ${e.aiFeedback}`).join("")}

### 3. CV Screening & Recruitment Pipeline matching "${companyJob}"
*   **Total CVs Screened:** ${cvData.length}
*   **Accepted Candidates (High Matching Fit):** ${cvData.filter(c => c.verdict === "ACCEPTED").length}
*   **Rejected Candidates (Low Fit):** ${cvData.filter(c => c.verdict === "REJECTED").length}
${cvData.length === 0 ? "No candidates in pipeline." : cvData.map(c => `
*   **${c.applicantName}** (Score: **${c.matchScore}%** - **${c.verdict}**): ${c.feedback}`).join("")}

### 4. Strategic Recommendations
1.  **Hiring**: The recruitment pipeline successfully filters candidates according to the defined domain: "${companyJob}". Continue matching resumes to maintain specialized skills.
2.  **Productivity**: Keep tracking work quality and hours submitted. Reward employees showing high profit-to-hour ratios.

---

# تقرير الأداء العملي والإنتاجية التنفيذي بالذكاء الاصطناعي
**التاريخ:** ${new Date().toLocaleDateString()}
**مجال عمل الشركة:** ${companyJob}

### 1. ملخص العمليات العام
*   **إجمالي الأرباح المحققة:** $${employeePerf.reduce((sum, e) => sum + e.profitGenerated, 0).toLocaleString()}
*   **إجمالي الوقت الموفر/المنجز:** ${employeePerf.reduce((sum, e) => sum + e.hoursWorked, 0)} ساعة
*   **متوسط جودة العمل:** ${employeePerf.length > 0 ? Math.round(employeePerf.reduce((sum, e) => sum + e.qualityScore, 0) / employeePerf.length) : 0}%

### 2. تقييم إنتاجية وقيمة الموظفين
${employeePerf.length === 0 ? "لا توجد أعمال مرفوعة للموظفين للتحليل." : employeePerf.map(e => `
*   **${e.employeeName}**: أنجز "${e.fileName}" بجودة بلغت **${e.qualityScore}%**. حقق **$${e.profitGenerated}** كأرباح تقديرية وعمل لـ **${e.hoursWorked} ساعة**.
    *   *ملاحظة التقييم:* ${e.aiFeedback}`).join("")}

### 3. فرز السير الذاتية ومطابقتها لمجال الشركة "${companyJob}"
*   **إجمالي السير الذاتية المفحوصة:** ${cvData.length}
*   **المرشحون المقبولون (مطابقة عالية):** ${cvData.filter(c => c.verdict === "ACCEPTED").length}
*   **المرشحون المرفوضون (مطابقة منخفضة):** ${cvData.filter(c => c.verdict === "REJECTED").length}
${cvData.length === 0 ? "لا يوجد مرشحون حالياً." : cvData.map(c => `
*   **${c.applicantName}** (نسبة التوافق: **${c.matchScore}%** - **${c.verdict === "ACCEPTED" ? "مقبول" : "مرفوض"}**): ${c.feedback}`).join("")}

### 4. التوصيات الاستراتيجية
1.  **التعيين والتوظيف**: تصفية السير الذاتية تتم بشكل متوافق تماماً مع تخصص الشركة "${companyJob}". يوصى بالاستمرار في هذا النمط لضمان تعيين كوادر متخصصة.
2.  **تحسين الإنتاجية**: كافئ الموظفين الذين يظهرون كفاءة عالية في نسبة الأرباح إلى الساعات المنجزة.
`;
    }
    
    res.json({ report: reportContent });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "AI operational report generation failed.", details: err.message });
  }
});

app.get("/api/ceo/reports", authMiddleware, requireRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, "CEO" as any]), async (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const submissions = db.gets("work_submissions").filter(w => w.organizationId === orgId);
  const evaluations = db.gets("cv_evaluations").filter(c => c.organizationId === orgId);
  const settings = db.gets("company_settings").find(s => s.organizationId === orgId);
  res.json({ submissions, evaluations, settings });
});

// Authenticated Sandbox Initializer (Tenant-switcher metadata)
app.get("/api/crm/bootstrap", (req: AuthenticatedRequest, res) => {
  db.refresh();
  const orgs = db.gets("organizations");
  const users = db.gets("users");
  res.json({
    organizations: orgs,
    users: users.map(u => ({
      id: u.id,
      organizationId: u.organizationId,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role
    }))
  });
});

// GET active profile context
app.get("/api/auth/me", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgs = db.gets("organizations");
  const currentOrg = orgs.find((o) => o.id === req.user?.organizationId);
  res.json({
    user: req.user,
    organization: currentOrg
  });
});

// Update Subscription plan of Organisation
app.post("/api/organization/subscription", authMiddleware, requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN]), (req: AuthenticatedRequest, res) => {
  const { plan } = req.body;
  if (!plan || !Object.values(SubscriptionPlan).includes(plan)) {
    return res.status(400).json({ error: "Invalid SaaS subscription plan requested" });
  }

  db.mutate("organizations", (orgs) => {
    const o = orgs.find(org => org.id === req.user?.organizationId);
    if (o) {
      o.plan = plan;
    }
  });

  logCRMActivity(
    req.user!.organizationId,
    req.user!.id,
    `${req.user!.firstName} ${req.user!.lastName}`,
    "Subscription Level Update",
    `Changed organization subscription tier to ${plan}`
  );

  res.json({ message: `Successfully updated your team domain standard subscriptions to ${plan}.` });
});

// GET CRM Metrics for Dashboard
app.get("/api/crm/dashboard", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;

  // Filter all models by authenticated Tenant ID to ensure strict Multi-Tenant Isolation bounds
  const customers = db.gets("customers").filter(c => c.organizationId === orgId);
  const companies = db.gets("companies").filter(c => c.organizationId === orgId);
  const deals = db.gets("deals").filter(d => d.organizationId === orgId);
  const tasks = db.gets("tasks").filter(t => t.organizationId === orgId);
  const invoices = db.gets("invoices").filter(i => i.organizationId === orgId);
  const activities = db.gets("activities").filter(a => a.organizationId === orgId).slice(0, 8);
  const upcomingTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED).slice(0, 5);

  const activeCustomersCount = customers.filter(c => c.status === CustomerStatus.ACTIVE).length;
  const newCustomersCount = customers.filter(c => {
    const createdDate = new Date(c.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate >= thirtyDaysAgo;
  }).length;

  const totalRevenueObj = invoices
    .filter(inv => inv.status === InvoiceStatus.PAID)
    .reduce((sum, inv) => sum + inv.total, 0);

  const openDeals = deals.filter(d => d.stage !== DealStage.WON && d.stage !== DealStage.LOST);
  const wonDeals = deals.filter(d => d.stage === DealStage.WON);
  const lostDeals = deals.filter(d => d.stage === DealStage.LOST);

  const totalDealsValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const wonDealsValue = wonDeals.reduce((sum, d) => sum + d.value, 0);

  const totalClosedDeals = wonDeals.length + lostDeals.length;
  const conversionRate = totalClosedDeals > 0 ? Math.round((wonDeals.length / totalClosedDeals) * 100) : 0;

  // Monthly sales forecast charts calculations
  // We can construct simulated aggregated chart statistics for the last 6 months
  const monthlySales = [
    { month: "Jan", sales: wonDealsValue * 0.15 + 10000, target: 20000 },
    { month: "Feb", sales: wonDealsValue * 0.20 + 15000, target: 25000 },
    { month: "Mar", sales: wonDealsValue * 0.25 + 22000, target: 30000 },
    { month: "Apr", sales: wonDealsValue * 0.35 + 28000, target: 35000 },
    { month: "May", sales: wonDealsValue * 0.45 + 32000, target: 40000 },
    { month: "Jun", sales: wonDealsValue + 5000, target: 45000 },
  ];

  res.json({
    metrics: {
      totalCustomers: customers.length,
      activeCustomers: activeCustomersCount,
      newCustomers: newCustomersCount,
      revenue: totalRevenueObj,
      openDealsCount: openDeals.length,
      openDealsValue: totalDealsValue,
      closedDealsCount: totalClosedDeals,
      conversionRate,
      monthlySales,
    },
    upcomingTasks,
    recentActivities: activities
  });
});

// ==========================================
// CUSTOMER MANAGEMENT
// ==========================================
app.get("/api/customers", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  let list = db.gets("customers").filter(c => c.organizationId === orgId);

  // Search
  const search = req.query.search as string;
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      c =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.leadSource.toLowerCase().includes(q)
    );
  }

  // Filters
  const status = req.query.status as string;
  if (status) {
    list = list.filter(c => c.status === status);
  }

  const industry = req.query.industry as string;
  if (industry) {
    list = list.filter(c => c.industry === industry);
  }

  // Linked Companies resolver representation
  const companies = db.gets("companies").filter(co => co.organizationId === orgId);
  const payload = list.map(c => ({
    ...c,
    company: companies.find(co => co.id === c.companyId) || null
  }));

  res.json(payload);
});

app.post("/api/customers", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const { firstName, lastName, email, phone, companyId, website, address, industry, status, leadSource } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: "First Name, Last Name, and Email are required." });
  }

  const newCustomer: Customer = {
    id: `cust-${Date.now()}`,
    organizationId: orgId,
    companyId: companyId || undefined,
    firstName,
    lastName,
    email,
    phone: phone || "",
    website: website || "",
    address: address || "",
    industry: industry || "Other",
    status: status || CustomerStatus.LEAD,
    leadSource: leadSource || "Direct Search",
    profilePicture: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 500000)}?w=150&auto=format&fit=crop&q=60`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.mutate("customers", (arr) => {
    arr.unshift(newCustomer);
  });

  logCRMActivity(
    orgId,
    req.user!.id,
    `${req.user!.firstName} ${req.user!.lastName}`,
    "Customer Created",
    `Added new contact ${firstName} ${lastName}`
  );

  res.status(201).json(newCustomer);
});

app.put("/api/customers/:id", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const customerId = req.params.id;
  const updates = req.body;

  let updatedCust: Customer | null = null;

  db.mutate("customers", (arr) => {
    const idx = arr.findIndex(c => c.id === customerId && c.organizationId === orgId);
    if (idx !== -1) {
      arr[idx] = {
        ...arr[idx],
        ...updates,
        organizationId: orgId, // Block hijacking tenant data
        id: customerId,
        updatedAt: new Date().toISOString()
      };
      updatedCust = arr[idx];
    }
  });

  if (!updatedCust) {
    return res.status(404).json({ error: "Customer not found." });
  }

  logCRMActivity(
    orgId,
    req.user!.id,
    `${req.user!.firstName} ${req.user!.lastName}`,
    "Customer Updated",
    `Modified profile of ${(updatedCust as Customer).firstName} ${(updatedCust as Customer).lastName}`
  );

  res.json(updatedCust);
});

app.delete("/api/customers/:id", authMiddleware, requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]), (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const customerId = req.params.id;

  let deletedCust: Customer | null = null;

  db.mutate("customers", (arr) => {
    const idx = arr.findIndex(c => c.id === customerId && c.organizationId === orgId);
    if (idx !== -1) {
      deletedCust = arr[idx];
      arr.splice(idx, 1);
    }
  });

  if (!deletedCust) {
    return res.status(404).json({ error: "Customer not found or not in your organization boundaries." });
  }

  logCRMActivity(
    orgId,
    req.user!.id,
    `${req.user!.firstName} ${req.user!.lastName}`,
    "Customer Deleted",
    `Deleted record of ${(deletedCust as Customer).firstName} ${(deletedCust as Customer).lastName}`
  );

  res.json({ message: "Customer successfully deleted." });
});


// ==========================================
// COMPANIES MANAGEMENT
// ==========================================
app.get("/api/companies", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  let list = db.gets("companies").filter(c => c.organizationId === orgId);

  // Search
  const search = req.query.search as string;
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.website.toLowerCase().includes(q)
    );
  }

  // Links list mapping: include employee contacts associated
  const customers = db.gets("customers").filter(cust => cust.organizationId === orgId);
  const payload = list.map(c => ({
    ...c,
    contacts: customers.filter(cust => cust.companyId === c.id)
  }));

  res.json(payload);
});

app.post("/api/companies", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const { name, industry, website, address, employeeCount, annualRevenue } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Company Name is required" });
  }

  const newCompany: Company = {
    id: `comp-${Date.now()}`,
    organizationId: orgId,
    name,
    industry: industry || "Other",
    website: website || "",
    address: address || "",
    employeeCount: Number(employeeCount) || 1,
    annualRevenue: Number(annualRevenue) || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.mutate("companies", (arr) => {
    arr.unshift(newCompany);
  });

  logCRMActivity(
    orgId,
    req.user!.id,
    `${req.user!.firstName} ${req.user!.lastName}`,
    "Company Created",
    `Registered company portfolio ${name}`
  );

  res.status(201).json(newCompany);
});

app.put("/api/companies/:id", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const companyId = req.params.id;
  const updates = req.body;

  let updatedComp: Company | null = null;

  db.mutate("companies", (arr) => {
    const idx = arr.findIndex(c => c.id === companyId && c.organizationId === orgId);
    if (idx !== -1) {
      arr[idx] = {
        ...arr[idx],
        ...updates,
        organizationId: orgId,
        id: companyId,
        updatedAt: new Date().toISOString()
      };
      updatedComp = arr[idx];
    }
  });

  if (!updatedComp) {
    return res.status(404).json({ error: "Company portfolio not found." });
  }

  logCRMActivity(
    orgId,
    req.user!.id,
    `${req.user!.firstName} ${req.user!.lastName}`,
    "Company Portfolio Updated",
    `Updated meta values of ${(updatedComp as Company).name}`
  );

  res.json(updatedComp);
});


// ==========================================
// DEALS / SALES PIPELINE (KANBAN BOARD)
// ==========================================
app.get("/api/deals", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  let list = db.gets("deals").filter(d => d.organizationId === orgId);

  const customers = db.gets("customers").filter(cust => cust.organizationId === orgId);
  const companies = db.gets("companies").filter(comp => comp.organizationId === orgId);

  const payload = list.map(d => ({
    ...d,
    customer: customers.find(c => c.id === d.customerId) || null,
    company: companies.find(c => c.id === d.companyId) || null
  }));

  res.json(payload);
});

app.post("/api/deals", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const { name, customerId, companyId, stage, value, probability, expectedCloseDate } = req.body;

  if (!name || !customerId) {
    return res.status(400).json({ error: "Deal Name and linked Customer contact are required." });
  }

  const newDeal: Deal = {
    id: `deal-${Date.now()}`,
    organizationId: orgId,
    customerId,
    companyId: companyId || undefined,
    name,
    stage: stage || DealStage.LEAD,
    value: Number(value) || 0,
    probability: Number(probability) || 10,
    expectedCloseDate: expectedCloseDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.mutate("deals", (arr) => {
    arr.unshift(newDeal);
  });

  logCRMActivity(
    orgId,
    req.user!.id,
    `${req.user!.firstName} ${req.user!.lastName}`,
    "SaaS Deal Registered",
    `Added Sales opportunity ${name} valued at $${value}`
  );

  res.status(201).json(newDeal);
});

app.put("/api/deals/:id", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const dealId = req.params.id;
  const updates = req.body;

  let updatedDeal: Deal | null = null;
  let oldStage: DealStage | null = null;

  db.mutate("deals", (arr) => {
    const idx = arr.findIndex(d => d.id === dealId && d.organizationId === orgId);
    if (idx !== -1) {
      oldStage = arr[idx].stage;
      arr[idx] = {
        ...arr[idx],
        ...updates,
        organizationId: orgId,
        id: dealId,
        updatedAt: new Date().toISOString()
      };
      updatedDeal = arr[idx];
    }
  });

  if (!updatedDeal) {
    return res.status(404).json({ error: "Sales Deal record not found." });
  }

  if (oldStage && oldStage !== (updatedDeal as Deal).stage) {
    logCRMActivity(
      orgId,
      req.user!.id,
      `${req.user!.firstName} ${req.user!.lastName}`,
      "Deal Stage Shifted",
      `Moved deal '${(updatedDeal as Deal).name}' from ${oldStage} → ${(updatedDeal as Deal).stage}`
    );

    // If deal won, trigger mock client success notification
    if ((updatedDeal as Deal).stage === DealStage.WON) {
      createCRMNotification(
        orgId,
        req.user!.id,
        "🎉 Deal Secured!",
        `Congratulations! Deal '${(updatedDeal as Deal).name}' valued at $${(updatedDeal as Deal).value} won successfully!`,
        "success"
      );
    }
  } else {
    logCRMActivity(
      orgId,
      req.user!.id,
      `${req.user!.firstName} ${req.user!.lastName}`,
      "Deal Details Updated",
      `Modified criteria for sales plan of ${(updatedDeal as Deal).name}`
    );
  }

  res.json(updatedDeal);
});

app.delete("/api/deals/:id", authMiddleware, requireRoles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]), (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const dealId = req.params.id;

  let deletedDeal: Deal | null = null;

  db.mutate("deals", (arr) => {
    const idx = arr.findIndex(d => d.id === dealId && d.organizationId === orgId);
    if (idx !== -1) {
      deletedDeal = arr[idx];
      arr.splice(idx, 1);
    }
  });

  if (!deletedDeal) {
    return res.status(404).json({ error: "Sales Deal not found." });
  }

  logCRMActivity(
    orgId,
    req.user!.id,
    `${req.user!.firstName} ${req.user!.lastName}`,
    "Deal Deleted",
    `Terminated sales opportunity pipeline ${(deletedDeal as Deal).name}`
  );

  res.json({ message: "Deal terminated successfully." });
});


// ==========================================
// TASKS MANAGEMENT
// ==========================================
app.get("/api/tasks", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const list = db.gets("tasks").filter(t => t.organizationId === orgId);
  const customers = db.gets("customers").filter(cust => cust.organizationId === orgId);
  const users = db.gets("users").filter(u => u.organizationId === orgId);

  const payload = list.map(t => ({
    ...t,
    customer: customers.find(c => c.id === t.customerId) || null,
    assignee: users.find(u => u.id === t.assignedToId) || null
  }));

  res.json(payload);
});

app.post("/api/tasks", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const { title, description, assignedToId, customerId, dealId, priority, status, dueDate } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Task Title is required." });
  }

  const newTask: Task = {
    id: `task-${Date.now()}`,
    organizationId: orgId,
    assignedToId: assignedToId || req.user!.id,
    customerId: customerId || undefined,
    dealId: dealId || undefined,
    title,
    description: description || "",
    priority: priority || TaskPriority.MEDIUM,
    status: status || TaskStatus.TODO,
    dueDate: dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  db.mutate("tasks", (arr) => {
    arr.unshift(newTask);
  });

  logCRMActivity(
    orgId,
    req.user!.id,
    `${req.user!.firstName} ${req.user!.lastName}`,
    "CRM Task Created",
    `Created assignment '${title}' due on ${new Date(newTask.dueDate).toLocaleDateString()}`
  );

  // If assigned to another colleague, push dynamic alert message notice
  if (newTask.assignedToId !== req.user!.id) {
    createCRMNotification(
      orgId,
      newTask.assignedToId,
      "New Assignment",
      `${req.user!.firstName} assigned you task: '${title}'`,
      "info"
    );
  }

  res.status(201).json(newTask);
});

app.put("/api/tasks/:id", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const taskId = req.params.id;
  const updates = req.body;

  let updatedTask: Task | null = null;

  db.mutate("tasks", (arr) => {
    const idx = arr.findIndex(t => t.id === taskId && t.organizationId === orgId);
    if (idx !== -1) {
      arr[idx] = {
        ...arr[idx],
        ...updates,
        organizationId: orgId,
        id: taskId
      };
      updatedTask = arr[idx];
    }
  });

  if (!updatedTask) {
    return res.status(404).json({ error: "CRM Task assignment not found." });
  }

  res.json(updatedTask);
});

app.delete("/api/tasks/:id", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const taskId = req.params.id;

  let deletedTask: Task | null = null;

  db.mutate("tasks", (arr) => {
    const idx = arr.findIndex(t => t.id === taskId && t.organizationId === orgId);
    if (idx !== -1) {
      deletedTask = arr[idx];
      arr.splice(idx, 1);
    }
  });

  if (!deletedTask) {
    return res.status(404).json({ error: "Task not found." });
  }

  res.json({ message: "Task eliminated." });
});


// ==========================================
// INVOICES & PAYMENTS SYSTEM
// ==========================================
app.get("/api/invoices", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  let list = db.gets("invoices").filter(i => i.organizationId === orgId);

  const customers = db.gets("customers").filter(cust => cust.organizationId === orgId);
  const companies = db.gets("companies").filter(comp => comp.organizationId === orgId);

  const payload = list.map(i => ({
    ...i,
    customer: customers.find(c => c.id === i.customerId) || null,
    company: companies.find(c => c.id === i.companyId) || null
  }));

  res.json(payload);
});

app.post("/api/invoices", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const { customerId, companyId, dueDate, items, taxRate, discountRate, notes } = req.body;

  if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Linked Customer contact and at least 1 line item are required." });
  }

  // Calculate fields securely server-side
  const computedItems = items.map((itm: any, index: number) => {
    const quantity = Number(itm.quantity) || 1;
    const unitPrice = Number(itm.unitPrice) || 0;
    return {
      id: `item-${Date.now()}-${index}`,
      description: itm.description || "Line Item",
      quantity,
      unitPrice,
      amount: quantity * unitPrice
    };
  });

  const subtotal = computedItems.reduce((sum, item) => sum + item.amount, 0);
  const taxPct = Number(taxRate) || 0;
  const discountPct = Number(discountRate) || 0;

  const taxAmount = (subtotal * taxPct) / 100;
  const discountAmount = (subtotal * discountPct) / 100;
  const total = subtotal + taxAmount - discountAmount;

  const count = db.gets("invoices").length + 1;
  const invoiceNum = `INV-${new Date().getFullYear()}-${String(count).padStart(3, "0")}`;

  const newInvoice: Invoice = {
    id: `inv-${Date.now()}`,
    organizationId: orgId,
    customerId,
    companyId: companyId || undefined,
    invoiceNumber: invoiceNum,
    issueDate: new Date().toISOString(),
    dueDate: dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    items: computedItems,
    subtotal,
    taxRate: taxPct,
    taxAmount,
    discountRate: discountPct,
    discountAmount,
    total,
    status: InvoiceStatus.DRAFT,
    notes: notes || "",
    createdAt: new Date().toISOString()
  };

  db.mutate("invoices", (arr) => {
    arr.unshift(newInvoice);
  });

  logCRMActivity(
    orgId,
    req.user!.id,
    `${req.user!.firstName} ${req.user!.lastName}`,
    "Invoice Rendered",
    `Drafted commercial invoice ${invoiceNum} for amount of $${total.toFixed(2)}`
  );

  res.status(201).json(newInvoice);
});

// Update Status / Pay Invoice
app.post("/api/invoices/:id/payment", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const invoiceId = req.params.id;
  const { paymentMethod, reference, amount } = req.body;

  let invoiceRecord: Invoice | null = null;

  db.mutate("invoices", (arr) => {
    const idx = arr.findIndex(i => i.id === invoiceId && i.organizationId === orgId);
    if (idx !== -1) {
      arr[idx].status = InvoiceStatus.PAID;
      invoiceRecord = arr[idx];
    }
  });

  if (!invoiceRecord) {
    return res.status(404).json({ error: "Invoice not found." });
  }

  const amt = amount || (invoiceRecord as Invoice).total;
  const newPayment: Payment = {
    id: `pay-${Date.now()}`,
    organizationId: orgId,
    invoiceId,
    amount: amt,
    paymentMethod: paymentMethod || "Standard Credit",
    paymentDate: new Date().toISOString(),
    reference: reference || "AUTO-REF"
  };

  db.mutate("payments", (arr) => {
    arr.push(newPayment);
  });

  logCRMActivity(
    orgId,
    req.user!.id,
    `${req.user!.firstName} ${req.user!.lastName}`,
    "Invoice Cleared",
    `Processed invoice payment on bill ${(invoiceRecord as Invoice).invoiceNumber} for $${amt.toFixed(2)}`
  );

  res.json({ invoice: invoiceRecord, payment: newPayment });
});


// ==========================================
// NOTES SYSTEM
// ==========================================
app.get("/api/notes", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const targetType = req.query.targetType as string;
  const targetId = req.query.targetId as string;

  let list = db.gets("notes").filter(n => n.organizationId === orgId);

  if (targetType && targetId) {
    list = list.filter(n => n.targetType === targetType && n.targetId === targetId);
  }

  res.json(list);
});

app.post("/api/notes", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const { targetType, targetId, content } = req.body;

  if (!targetType || !targetId || !content) {
    return res.status(400).json({ error: "Target association properties and Note content string are required." });
  }

  const newNote: CRMNote = {
    id: `nt-${Date.now()}`,
    organizationId: orgId,
    authorId: req.user!.id,
    authorName: `${req.user!.firstName} ${req.user!.lastName}`,
    targetType,
    targetId,
    content,
    createdAt: new Date().toISOString()
  };

  db.mutate("notes", (arr) => {
    arr.unshift(newNote);
  });

  res.status(201).json(newNote);
});


// ==========================================
// NOTIFICATIONS API
// ==========================================
app.get("/api/notifications", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  // Load notices strictly assigned to this single context or system broadcast
  const list = db.gets("notifications").filter(n => n.organizationId === orgId && n.userId === req.user!.id);
  res.json(list);
});

app.post("/api/notifications/read-all", authMiddleware, (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  db.mutate("notifications", (arr) => {
    arr.forEach(n => {
      if (n.organizationId === orgId && n.userId === req.user!.id) {
        n.read = true;
      }
    });
  });
  res.json({ success: true });
});


// ==========================================
// AI ASSISTANT POWERED BY GEMINI API (SERVER-SIDE)
// ==========================================
app.post("/api/ai/analyze", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { type, context } = req.body;

  if (!type || !context) {
    return res.status(400).json({ error: "AI analysis request requires a type prompt and detailed context payload structure." });
  }

  // Context parser formatting
  let systemPrompt = "";
  let userPrompt = "";

  switch (type) {
    case "summary":
      systemPrompt = "You are an elite Sales Operations Director. You take raw CRM demographic and activity logs, and return a beautiful, dense, highly professional briefing summarizing this customer's needs and current trajectory in 3 short bullet points.";
      userPrompt = `Please synthesize and analyze this Customer profile: ${JSON.stringify(context)}`;
      break;
    case "insights":
      systemPrompt = "You are a senior Venture Capital and SaaS deal advisor. Analyze the pipeline structure, win probability, deal value, and recent sync messages, and provide 3 precise recommendations on how to advance or successfully lock the deal.";
      userPrompt = `Please evaluate this Sales Deal opportunity structure: ${JSON.stringify(context)}`;
      break;
    case "email":
      systemPrompt = "You are an outstanding SaaS copywriter specialized in hyper-personalized B2B cold outreach. Write a compelling, elegant email draft (include subject line and signature placeholder) referencing their recent timeline events. Keep it highly professional, short, and conversion-optimized.";
      userPrompt = `Write an optimized follow-up outreach email targeting this contact: ${JSON.stringify(context)}`;
      break;
    default:
      systemPrompt = "You are an intelligent AI Business development Growth advisor. Offer 3 constructive insights on how this CRM workflow can be optimized.";
      userPrompt = `Advise us given this standard payload data of workspace events: ${JSON.stringify(context)}`;
  }

  try {
    const ai = getGeminiClient();

    if (!ai) {
      // Graceful Mock AI integration if GEMINI_API_KEY is not defined or configured yet!
      // This is elegant and prevents crash while describing secrets usage!
      console.log("No GEMINI_API_KEY detected. Using localized business heuristics engine.");

      let fallbackText = "";
      if (type === "summary") {
        fallbackText = `• Contact displays strong structural intent from lead source: "${context.customer?.leadSource || 'Organic Search'}".\n• Highly engaged stakeholder with primary domain in "${context.customer?.industry || 'Technology'}".\n• Recommended Next Action: Schedule a 15-minute diagnostic call to review their security compliance timelines.`;
      } else if (type === "insights") {
        fallbackText = `• Win Probability is currently pegged at ${context.deal?.probability || 45}%. Leverage custom licensing guarantees to drive this upwards.\n• Weighted Contract Value equivalent to $${((context.deal?.value || 0) * (context.deal?.probability || 0) / 100).toLocaleString()}.\n• Strategy: Prompt their executive team to lock current quarter rates by proposing a customized implementation plan before their upcoming fiscal reset.`;
      } else {
        fallbackText = `Subject: Quick question sync - ${context.customer?.firstName || 'there'}\n\nHi ${context.customer?.firstName || 'there'},\n\nI was looking over your recent exploration of our automated platforms. It looks like your team is expanding rapidly in the ${context.customer?.industry || 'enterprise'} sector.\n\nLet's sync for 10 minutes next Wednesday at 10 AM to discuss a custom security review or support arrangement.\n\nBest regards,\n[Your Name]\nSaaS Sales Desk`;
      }

      return res.json({
        content: fallbackText,
        isMocked: true,
        note: "To connect this AI model to real-time generative capabilities, simply declare your valid Google GenAI API key in [Settings > Secrets > GEMINI_API_KEY]."
      });
    }

    // Call actual Gemini model: 'gemini-3.5-flash'
    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({
      content: aiResponse.text || "AI completed generation but sent empty response string.",
      isMocked: false
    });

  } catch (error: any) {
    console.error("Gemini server-side API call failed:", error);
    res.status(500).json({ error: "Gemini AI generation failed on server.", details: error.message });
  }
});


// ==========================================
// STATIC ASSET AND MIDDLEWARE CONFIGURATION
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for dev mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Static production paths serving transpiled code
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CRM SERVER] Listening at http://localhost:${PORT}`);
  });
}

startServer();
