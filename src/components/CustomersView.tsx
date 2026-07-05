/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Download,
  Printer,
  ChevronDown,
  Building,
  Mail,
  Phone,
  Link,
  MapPin,
  MoreVertical,
  Layers,
  Sparkles
} from "lucide-react";
import { CustomerStatus } from "../types.js";

interface CustomersViewProps {
  customers: any[];
  companies: any[];
  onCreateCustomer: (data: any) => Promise<any>;
  onUpdateCustomer: (id: string, data: any) => Promise<any>;
  onDeleteCustomer: (id: string) => Promise<any>;
  onTriggerAI: (type: "summary" | "email", context: any) => void;
  userRole: string;
}

export default function CustomersView({
  customers = [],
  companies = [],
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onTriggerAI,
  userRole
}: CustomersViewProps) {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");

  // Modal forms states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState<string | null>(null);

  // Form Fields State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState(CustomerStatus.LEAD);
  const [leadSource, setLeadSource] = useState("");

  const industries = Array.from(new Set(customers.map((c) => c.industry).filter(Boolean)));

  // Filtered customers list
  const filteredList = customers.filter((c) => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const searchMatch =
      fullName.includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.company?.name || "").toLowerCase().includes(searchTerm.toLowerCase());

    const statusMatch = !statusFilter || c.status === statusFilter;
    const industryMatch = !industryFilter || c.industry === industryFilter;

    return searchMatch && statusMatch && industryMatch;
  });

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCompanyId("");
    setWebsite("");
    setAddress("");
    setIndustry("");
    setStatus(CustomerStatus.LEAD);
    setLeadSource("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email) return alert("Required fields missing!");
    await onCreateCustomer({
      firstName,
      lastName,
      email,
      phone,
      companyId,
      website,
      address,
      industry,
      status,
      leadSource
    });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEditClick = (c: any) => {
    setSelectedCustId(c.id);
    setFirstName(c.firstName);
    setLastName(c.lastName);
    setEmail(c.email);
    setPhone(c.phone || "");
    setCompanyId(c.companyId || "");
    setWebsite(c.website || "");
    setAddress(c.address || "");
    setIndustry(c.industry || "");
    setStatus(c.status);
    setLeadSource(c.leadSource || "");
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustId) return;
    await onUpdateCustomer(selectedCustId, {
      firstName,
      lastName,
      email,
      phone,
      companyId,
      website,
      address,
      industry,
      status,
      leadSource
    });
    setIsEditOpen(false);
    resetForm();
  };

  // Real CSV Export File Download block!
  const triggerCSVExport = () => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Status", "Lead Source", "Industry", "Website", "Created At"];
    const csvRows = [headers.join(",")];

    filteredList.forEach((c) => {
      const row = [
        `"${c.firstName}"`,
        `"${c.lastName}"`,
        `"${c.email}"`,
        `"${c.phone || ''}"`,
        `"${c.status}"`,
        `"${c.leadSource || ''}"`,
        `"${c.industry || ''}"`,
        `"${c.website || ''}"`,
        `"${new Date(c.createdAt).toLocaleDateString()}"`,
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_contacts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Real layout window print preview handler
  const triggerPrintLayout = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters top bar actions bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 shadow-sm relative z-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 grow max-w-3xl">
          {/* Search bar */}
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search customers, company names, emails, phones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs w-full rounded-lg bg-slate-55 border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-50 transition-all text-slate-800"
            />
          </div>

          {/* Filtering dropdown selects */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 text-slate-700 text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {Object.values(CustomerStatus).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="bg-slate-50 text-slate-700 text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none"
            >
              <option value="">All Industries</option>
              {industries.map((ind: any) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action utility triggers (Create + Exports) */}
        <div className="flex items-center gap-2 shink-0">
          <button
            onClick={triggerCSVExport}
            className="p-2 text-slate-650 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer text-xs flex items-center gap-1.5"
            title="Download contact CSV"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={triggerPrintLayout}
            className="p-2 text-slate-650 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer text-xs flex items-center gap-1.5"
            title="Print contact layout sheets"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Customer Registry list card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">No customers matched search terms</p>
              <p className="text-xs text-slate-450">Clear filtered parameters or add custom leads from the actions menu.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Customer Name</th>
                  <th className="py-3 px-5">Contact Details</th>
                  <th className="py-3 px-5">SaaS Status</th>
                  <th className="py-3 px-5">Industry</th>
                  <th className="py-3 px-5">Lead Origin</th>
                  <th className="py-3 px-5 text-right">Quick AI Toolkit</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredList.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.profilePicture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=60"}
                          alt={`${c.firstName} avatar`}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover shadow-sm bg-slate-100"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block text-[13px]">
                            {c.firstName} {c.lastName}
                          </span>
                          {c.company ? (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Building className="w-3 h-3 text-slate-400" />
                              {c.company.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No associated portfolio</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-5 space-y-1">
                      <p className="text-slate-650 flex items-center gap-1.5 leading-none">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {c.email}
                      </p>
                      {c.phone && (
                        <p className="text-slate-500 flex items-center gap-1.5 leading-none font-mono text-[10px]">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {c.phone}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-5">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          c.status === CustomerStatus.ACTIVE
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : c.status === CustomerStatus.LEAD
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            : c.status === CustomerStatus.INACTIVE
                            ? "bg-slate-150 text-slate-600"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>

                    <td className="py-3 px-5 text-slate-650 font-medium">
                      {c.industry || "General Commercial"}
                    </td>

                    <td className="py-3 px-5 text-slate-500 font-mono text-[11px]">
                      {c.leadSource || "Website search"}
                    </td>

                    {/* Gemini AI smart assist actions context */}
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onTriggerAI("summary", c)}
                          className="px-2 py-1 text-[10px] bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 text-indigo-650 font-semibold rounded hover:from-indigo-100 hover:to-indigo-200 transition-colors cursor-pointer flex items-center gap-1"
                          title="Generate instant customer summary with AI"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          Summarize
                        </button>
                        <button
                          onClick={() => onTriggerAI("email", c)}
                          className="px-2 py-1 text-[10px] bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 text-amber-700 font-semibold rounded hover:from-amber-100 hover:to-amber-200 transition-all cursor-pointer"
                          title="Generate personalized pitch draft via AI"
                        >
                          Mail Draft
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEditClick(c)}
                          className="p-1.5 text-slate-600 hover:text-indigo-650 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                          title="Edit Customer Profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to permanently delete client: ${c.firstName} ${c.lastName}?`)) {
                              onDeleteCustomer(c.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                          title="Delete Contact Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE CUSTOMER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto modal-content">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950">Add Customer Contact</h3>
                <p className="text-xs text-slate-450">Seed workspace profiles matching tenant guidelines.</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-650 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Hank"
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Scorpio"
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hank@globex.web"
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 0180"
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Linked Portfolio Company</label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-slate-50/50"
                  >
                    <option value="">-- No Association --</option>
                    {companies.map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Industry</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Manufacturing, Telecom"
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Lead Source</label>
                  <input
                    type="text"
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value)}
                    placeholder="Cold outreach, Google Ad"
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                    className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-slate-50/50"
                  >
                    {Object.values(CustomerStatus).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://globex.web"
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Address Location</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address street number"
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 border border-slate-200 text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-650 text-white font-semibold text-xs hover:bg-indigo-700 shadow-sm"
                >
                  Register Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto modal-content">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Customer Information</h3>
                <p className="text-xs text-slate-450">Review parameters securely.</p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-650 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Linked Portfolio Company</label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-slate-50/50"
                  >
                    <option value="">-- No Association --</option>
                    {companies.map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Industry</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Lead Source</label>
                  <input
                    type="text"
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                    className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-slate-50/50"
                  >
                    {Object.values(CustomerStatus).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Address Location</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 border border-slate-200 text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs hover:bg-indigo-700 shadow-sm"
                >
                  Update Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
