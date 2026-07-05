/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { UserRole, SubscriptionPlan } from "../types.js";
import { Database, Shield, Layers, Users, Sparkles, RefreshCw } from "lucide-react";

interface TenantBarProps {
  currentTenantId: string;
  currentUserId: string;
  onTenantChange: (tenantId: string) => void;
  onUserChange: (userId: string) => void;
  onSubChange: (plan: SubscriptionPlan) => void;
  userProfile: any;
  orgDetails: any;
  allBootstrapData: any;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function TenantBar({
  currentTenantId,
  currentUserId,
  onTenantChange,
  onUserChange,
  onSubChange,
  userProfile,
  orgDetails,
  allBootstrapData,
  isLoading,
  onRefresh
}: TenantBarProps) {
  const organizations = allBootstrapData?.organizations || [];
  const users = allBootstrapData?.users || [];

  // Filter users belonging to selected Organization to present valid choices
  const availableUsers = users.filter((u: any) => u.organizationId === currentTenantId);

  return (
    <div className="bg-slate-900 text-slate-200 border-b border-slate-800 py-3.5 px-6 shadow-md transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Sandbox Meta Info */}
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 p-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-md">
            <Layers className="w-4 h-4 text-slate-950" />
            SaaS SANDBOX
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white tracking-wide text-sm flex items-center gap-1">
                {orgDetails?.name || "Loading..."}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                {orgDetails?.plan || "ENTERPRISE"} Plan
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Database className="w-3 h-3 text-slate-500" />
              Tenant ID: <span className="font-mono text-slate-300">{currentTenantId}</span>
            </p>
          </div>
        </div>

        {/* Dynamic Sandbox Switchees */}
        <div className="flex flex-wrap items-center gap-3 md:gap-5">
          {/* Org Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Organization:
            </span>
            <select
              value={currentTenantId}
              onChange={(e) => {
                const nextOrg = e.target.value;
                onTenantChange(nextOrg);
                // Automatically activate first available user inside that tenant
                const firstUser = users.find((u: any) => u.organizationId === nextOrg);
                if (firstUser) onUserChange(firstUser.id);
              }}
              className="bg-slate-800 hover:bg-slate-750 text-slate-100 text-xs rounded border border-slate-700 py-1 px-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              {organizations.map((org: any) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.subdomain}.crm)
                </option>
              ))}
            </select>
          </div>

          {/* User Persona Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-400" /> Role Persona:
            </span>
            <select
              value={currentUserId}
              onChange={(e) => onUserChange(e.target.value)}
              className="bg-slate-800 hover:bg-slate-750 text-slate-100 text-xs rounded border border-slate-700 py-1 px-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {availableUsers.map((usr: any) => (
                <option key={usr.id} value={usr.id}>
                  {usr.firstName} {usr.lastName} ({usr.role})
                </option>
              ))}
            </select>
          </div>

          {/* Subscription Tier Plan Changer */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Tier:
            </span>
            <select
              value={orgDetails?.plan || SubscriptionPlan.PROFESSIONAL}
              onChange={(e) => onSubChange(e.target.value as SubscriptionPlan)}
              className="bg-slate-800 hover:bg-slate-750 text-amber-200 text-xs rounded border border-amber-800/45 py-1 px-2.5 focus:ring-1 focus:ring-amber-500"
            >
              {Object.values(SubscriptionPlan).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 px-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors text-xs flex items-center gap-1 cursor-pointer border border-slate-700/50"
            title="Reload CRM DB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>
    </div>
  );
}
