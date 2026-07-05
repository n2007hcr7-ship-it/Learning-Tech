/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Building,
  Plus,
  Search,
  Globe,
  MapPin,
  Users as UsersIcon,
  DollarSign,
  Briefcase,
  ExternalLink,
  Edit2
} from "lucide-react";

interface CompaniesViewProps {
  companies: any[];
  onCreateCompany: (data: any) => Promise<any>;
  onUpdateCompany: (id: string, data: any) => Promise<any>;
}

export default function CompaniesView({
  companies = [],
  onCreateCompany,
  onUpdateCompany
}: CompaniesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);

  // Fields state
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [employeeCount, setEmployeeCount] = useState<number>(10);
  const [annualRevenue, setAnnualRevenue] = useState<number>(100000);

  const filtered = companies.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.website.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const resetForm = () => {
    setName("");
    setIndustry("");
    setWebsite("");
    setAddress("");
    setEmployeeCount(10);
    setAnnualRevenue(100000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return alert("Company Name is required!");
    await onCreateCompany({ name, industry, website, address, employeeCount, annualRevenue });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEditClick = (c: any) => {
    setSelectedCompId(c.id);
    setName(c.name);
    setIndustry(c.industry || "");
    setWebsite(c.website || "");
    setAddress(c.address || "");
    setEmployeeCount(c.employeeCount || 0);
    setAnnualRevenue(c.annualRevenue || 0);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompId) return;
    await onUpdateCompany(selectedCompId, { name, industry, website, address, employeeCount, annualRevenue });
    setIsEditOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Search top section action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-405 text-slate-405 transition-colors" />
          <input
            type="text"
            placeholder="Search company portfolios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3 py-2 text-xs w-full rounded-lg bg-slate-50 border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto"
        >
          <Plus className="w-4 h-4" />
          New Company
        </button>
      </div>

      {/* Grid Portfolio representation list items */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center bg-white border border-slate-100 rounded-2xl">
          <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-800 text-sm">No Companies Found</p>
          <p className="text-xs text-slate-400">Add enterprise client portfolios to associate employee contacts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((co) => (
            <div
              key={co.id}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 shrink-0">
                      <Building className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 line-clamp-1 leading-snug">{co.name}</h3>
                      <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider bg-slate-100 py-0.5 px-2 rounded-md mt-1 inline-block">
                        {co.industry || "General Commercial"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEditClick(co)}
                    className="p-1.5 text-slate-400 hover:text-indigo-650 rounded-lg"
                    title="Edit company metrics"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{co.employeeCount || "N/A"} Staff</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-mono text-[11px] font-semibold text-slate-650">
                      ${((co.annualRevenue || 0) / 1000000).toFixed(1)}M Rev
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  {co.address && (
                    <p className="text-slate-500 flex items-start gap-1 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{co.address}</span>
                    </p>
                  )}
                  {co.website && (
                    <p className="text-indigo-650 flex items-center gap-1.5 font-mono text-[10px]">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={co.website} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-0.5">
                        {co.website.replace("https://", "")}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Linked Contacts sub block tags view */}
              <div className="pt-3 border-t border-slate-50 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Associated Contacts ({co.contacts?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-[64px] overflow-y-auto">
                  {(!co.contacts || co.contacts.length === 0) ? (
                    <span className="text-[10px] text-slate-450 italic">No linked contacts yet.</span>
                  ) : (
                    co.contacts.map((c: any) => (
                      <span
                        key={c.id}
                        className="inline-block px-2 py-0.5 rounded bg-indigo-50/70 text-indigo-650 text-[10px] font-bold border border-indigo-100"
                        title={c.email}
                      >
                        {c.firstName} {c.lastName}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PORTFOLIO MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Company Profile</h3>
                <p className="text-xs text-slate-400">Add enterprise client portfolios to standard workspace.</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Globex Corporation"
                  className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Industry</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Manufacturing, Software development"
                  className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Total Employees</label>
                  <input
                    type="number"
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Annual Revenue ($)</label>
                  <input
                    type="number"
                    value={annualRevenue}
                    onChange={(e) => setAnnualRevenue(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Website URL</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://globex.web"
                  className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Manufacturing Way, Detroit"
                  className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-650 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm"
                >
                  Create Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PORTFOLIO MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Modify Company Profile</h3>
                <p className="text-xs text-slate-400">Review parameters securely.</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                />
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Total Employees</label>
                  <input
                    type="number"
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Annual Revenue ($)</label>
                  <input
                    type="number"
                    value={annualRevenue}
                    onChange={(e) => setAnnualRevenue(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Website URL</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-650 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm"
                >
                  Commit Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
