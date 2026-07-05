/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// User roles in RBAC system
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  SALES_REP = "SALES_REP",
  EMPLOYEE = "EMPLOYEE"
}

// Subscription levels
export enum SubscriptionPlan {
  FREE = "FREE",
  STARTER = "STARTER",
  PROFESSIONAL = "PROFESSIONAL",
  ENTERPRISE = "ENTERPRISE"
}

// Customer Status
export enum CustomerStatus {
  LEAD = "LEAD",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  CHURNED = "CHURNED"
}

// Deal Stage
export enum DealStage {
  LEAD = "LEAD",
  QUALIFIED = "QUALIFIED",
  PROPOSAL = "PROPOSAL",
  NEGOTIATION = "NEGOTIATION",
  WON = "WON",
  LOST = "LOST"
}

// Task Status & Priority
export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  OVERDUE = "OVERDUE"
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

// Invoice Status
export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED"
}

// Shared Interfaces
export interface Organization {
  id: string;
  name: string;
  subdomain: string;
  industry: string;
  plan: SubscriptionPlan;
  createdAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
  createdAt: string;
}

export interface Company {
  id: string;
  organizationId: string;
  name: string;
  industry: string;
  website: string;
  address: string;
  employeeCount: number;
  annualRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  organizationId: string;
  companyId?: string; // linked company
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  industry: string;
  status: CustomerStatus;
  leadSource: string;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  organizationId: string;
  customerId: string;
  companyId?: string;
  name: string;
  stage: DealStage;
  value: number;
  probability: number; // 0 to 100
  expectedCloseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  organizationId: string;
  assignedToId: string; // User ID
  customerId?: string; // Linked context
  dealId?: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  customerId: string;
  companyId?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number; // percentage (e.g. 15 for 15%)
  taxAmount: number;
  discountRate: number; // percentage
  discountAmount: number;
  total: number;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  organizationId: string;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string;
}

export interface CRMNote {
  id: string;
  organizationId: string;
  authorId: string;
  authorName: string;
  targetType: "customer" | "company" | "deal" | "task" | "invoice";
  targetId: string;
  content: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface CRMNotification {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "reminder";
  read: boolean;
  createdAt: string;
}

// Session state / API responses
export interface AuthResponse {
  user: User;
  organization: Organization;
  token: string;
}

export interface CompanySetting {
  id: string;
  organizationId: string;
  jobDescription: string;
  updatedAt: string;
}

export interface CVEvaluation {
  id: string;
  organizationId: string;
  applicantName: string;
  verdict: "ACCEPTED" | "REJECTED" | "PENDING";
  aiScore: number;
  aiFeedback: string;
  createdAt: string;
}

export interface WorkSubmission {
  id: string;
  organizationId: string;
  userId: string;
  fileName: string;
  qualityScore: number;
  estimatedHours: number;
  profitGenerated: number;
  aiFeedback: string;
  createdAt: string;
}
