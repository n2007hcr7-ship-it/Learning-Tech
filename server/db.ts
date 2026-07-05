/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import {
  UserRole,
  SubscriptionPlan,
  CustomerStatus,
  DealStage,
  TaskStatus,
  TaskPriority,
  InvoiceStatus,
  Organization,
  User,
  Company,
  Customer,
  Deal,
  Task,
  Invoice,
  Payment,
  CRMNote,
  ActivityLog,
  CRMNotification,
  CompanySetting,
  CVEvaluation,
  WorkSubmission
} from "../src/types.js";

// File-based persistent store Path
const DB_FILE = path.join(process.cwd(), "crm_database.json");

interface DBStructure {
  organizations: Organization[];
  users: User[];
  companies: Company[];
  customers: Customer[];
  deals: Deal[];
  tasks: Task[];
  invoices: Invoice[];
  payments: Payment[];
  notes: CRMNote[];
  activities: ActivityLog[];
  notifications: CRMNotification[];
  company_settings: CompanySetting[];
  cv_evaluations: CVEvaluation[];
  work_submissions: WorkSubmission[];
}

// Initial seeding data
const initialData: DBStructure = {
  organizations: [
    {
      id: "org-acme",
      name: "My Company",
      subdomain: "acme",
      industry: "Technology",
      plan: SubscriptionPlan.ENTERPRISE,
      createdAt: "2026-01-10T08:00:00Z"
    }
  ],
  users: [
    {
      id: "usr-admin-acme",
      organizationId: "org-acme",
      firstName: "Admin",
      lastName: "User",
      email: "admin@mycompany.com",
      password: "hashed_password_here",
      role: UserRole.SUPER_ADMIN,
      createdAt: "2026-01-10T08:05:00Z"
    },
    {
      id: "usr-emp",
      organizationId: "org-acme",
      firstName: "Employee",
      lastName: "One",
      email: "employee@mycompany.com",
      password: "hashed_password_here",
      role: UserRole.EMPLOYEE,
      createdAt: "2026-01-11T08:00:00Z"
    }
  ],
  companies: [],
  customers: [],
  deals: [],
  tasks: [],
  invoices: [],
  payments: [],
  notes: [],
  activities: [],
  notifications: [],
  company_settings: [],
  cv_evaluations: [],
  work_submissions: []
};

// Database class
class DatabaseStore {
  private data: DBStructure;

  constructor() {
    this.data = this.load();
  }

  // Load database from file system
  private load(): DBStructure {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        return JSON.parse(fileContent);
      }
    } catch (e) {
      console.warn("DB file corrupt or missing. Re-seeding database.", e);
    }
    // Write out the initial seeded structure if doesn't exist
    this.saveData(initialData);
    return JSON.parse(JSON.stringify(initialData));
  }

  // Write database out to file system
  private saveData(data: DBStructure) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Unable to write out CRM database:", e);
    }
  }

  // Reload dynamically
  public refresh() {
    this.data = this.load();
  }

  // Getters for primary resource collections
  public gets<K extends keyof DBStructure>(key: K): DBStructure[K] {
    return this.data[key];
  }

  // Set collection & persists
  public mutate<K extends keyof DBStructure>(key: K, updateFn: (arr: DBStructure[K]) => void) {
    updateFn(this.data[key]);
    this.saveData(this.data);
  }
}

export const db = new DatabaseStore();
