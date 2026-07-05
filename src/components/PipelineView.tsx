/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Layers,
  Plus,
  Briefcase,
  DollarSign,
  ChevronRight,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Award
} from "lucide-react";
import { DealStage } from "../types.js";

interface PipelineViewProps {
  deals: any[];
  customers: any[];
  companies: any[];
  onCreateDeal: (data: any) => Promise<any>;
  onUpdateDeal: (id: string, data: any) => Promise<any>;
  onTriggerAI: (type: "insights", context: any) => void;
}

export default function PipelineView({
  deals = [],
  customers = [],
  companies = [],
  onCreateDeal,
  onUpdateDeal,
  onTriggerAI
}: PipelineViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [value, setValue] = useState<number>(10000);
  const [probability, setProbability] = useState<number>(30);
  const [stage, setStage] = useState(DealStage.LEAD);

  const stages = [
    { key: DealStage.LEAD, label: "Lead Identification", color: "border-t-slate-400 bg-slate-50 text-slate-800" },
    { key: DealStage.QUALIFIED, label: "Qualified Opportunity", color: "border-t-blue-400 bg-blue-50/40 text-blue-850" },
    { key: DealStage.PROPOSAL, label: "Proposal Rendered", color: "border-t-indigo-400 bg-indigo-50/30 text-indigo-850" },
    { key: DealStage.NEGOTIATION, label: "Negotiating", color: "border-t-amber-400 bg-amber-50/30 text-amber-900" },
    { key: DealStage.WON, label: "Closed Won", color: "border-t-emerald-400 bg-emerald-50/40 text-emerald-900" },
    { key: DealStage.LOST, label: "Closed Lost", color: "border-t-rose-400 bg-rose-50/30 text-rose-900" }
  ];

  // Group deals strictly by Stage key helper
  const getDealsInStage = (stageKey: DealStage) => deals.filter((d) => d.stage === stageKey);

  // Stage totals summation
  const calculateStageSumVal = (stageKey: DealStage) => {
    return deals.filter((d) => d.stage === stageKey).reduce((sum, d) => sum + (d.value || 0), 0);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !customerId) return alert("Deal name and linked contact are required!");
    await onCreateDeal({ name, customerId, companyId: companyId || undefined, value, probability, stage });
    setIsCreateOpen(false);
    // Reset
    setName("");
    setCustomerId("");
    setCompanyId("");
    setValue(10000);
    setProbability(30);
    setStage(DealStage.LEAD);
  };

  const handleMoveStage = async (dealId: string, nextStage: DealStage) => {
    // Standard quick prob estimators default values for stage leaps
    let prob = 10;
    if (nextStage === DealStage.QUALIFIED) prob = 30;
    else if (nextStage === DealStage.PROPOSAL) prob = 50;
    else if (nextStage === DealStage.NEGOTIATION) prob = 75;
    else if (nextStage === DealStage.WON) prob = 100;
    else if (nextStage === DealStage.LOST) prob = 0;

    await onUpdateDeal(dealId, { stage: nextStage, probability: prob });
  };

  return (
    <div className="space-y-6">
      {/* Metrics pipeline banner stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 shadow-sm relative">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Pipeline Value
          </span>
          <p className="text-2xl font-extrabold text-slate-900">
            ${deals.reduce((sum, d) => sum + (d.value || 0), 0).toLocaleString()}
          </p>
          <span className="text-xs text-slate-500">Across {deals.length} opportunities</span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Weighted Forecast Value
          </span>
          <p className="text-2xl font-extrabold text-indigo-600">
            $
            {Math.round(
              deals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 0) / 100), 0)
            ).toLocaleString()}
          </p>
          <span className="text-xs text-slate-500">Based on deal probabilities</span>
        </div>

        {/* Add deal trigger alignment */}
        <div className="flex items-center sm:justify-end shrink-0">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Sales Deal
          </button>
        </div>
      </div>

      {/* Kanban Board Outer row */}
      <div className="flex gap-4 overflow-x-auto pb-4 max-w-full">
        {stages.map((stg) => {
          const list = getDealsInStage(stg.key);
          const totalVal = calculateStageSumVal(stg.key);

          return (
            <div
              key={stg.key}
              className="flex-1 min-w-[270px] max-w-[340px] shrink-0 bg-slate-50/60 rounded-2xl border border-slate-150 p-4 space-y-3 flex flex-col justify-between"
            >
              {/* Stage header */}
              <div className="space-y-1">
                <div className={`p-1.5 border-t-4 rounded-t-md ${stg.color} flex justify-between items-center`}>
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">{stg.label}</span>
                  <span className="bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full font-bold text-[10px]">
                    {list.length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 text-[11px] text-slate-500 font-mono">
                  <span>Forecast Weight</span>
                  <span className="font-semibold text-slate-700">${totalVal.toLocaleString()}</span>
                </div>
              </div>

              {/* Stack deals list items */}
              <div className="space-y-2.5 grow overflow-y-auto max-h-[460px] pr-1 py-1">
                {list.length === 0 ? (
                  <div className="border border-dashed border-slate-200 border-spacing-2 rounded-2xl py-8 text-center text-slate-400 text-[11px] italic">
                    No active deals in this stage.
                  </div>
                ) : (
                  list.map((d) => (
                    <div
                      key={d.id}
                      className="bg-white rounded-xl p-4 border border-slate-150 shadow-xs hover:shadow-md transition-shadow relative space-y-3 group border-l-3 border-l-slate-350"
                    >
                      {/* Deal meta info */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">
                          {d.company?.name || "Independent Stakeholder"}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-xs leading-snug group-hover:text-indigo-650 transition-colors">
                          {d.name}
                        </h4>
                      </div>

                      {/* Currency details */}
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="font-extrabold text-slate-850 text-xs">${(d.value || 0).toLocaleString()}</span>
                        <span className="text-[10px] text-slate-450 font-mono">prob: {d.probability}%</span>
                      </div>

                      {/* Linked CRM contact display details */}
                      {d.customer && (
                        <div className="p-2 bg-slate-50 rounded-lg text-[10px] text-slate-500 flex items-center justify-between">
                          <span className="truncate">👤 {d.customer.firstName} {d.customer.lastName}</span>
                        </div>
                      )}

                      {/* Moving Controls Buttons rows (Simulating full drag-drop via simplified buttons trigger) */}
                      <div className="pt-2 border-t border-slate-50 flex items-center justify-between gap-1">
                        {/* AI Opportunity Insights tool trigger */}
                        <button
                          onClick={() => onTriggerAI("insights", d)}
                          className="px-2 py-1 text-[9px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-650 border border-indigo-100 rounded flex items-center gap-0.5"
                          title="Generate instant opportunity insights with Gemini"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                          AI Insights
                        </button>

                        <div className="flex items-center gap-1">
                          {/* Left Arrow index reducer */}
                          {stg.key !== DealStage.LEAD && (
                            <button
                              onClick={() => {
                                const index = stages.findIndex((s) => s.key === stg.key);
                                if (index > 0) handleMoveStage(d.id, stages[index - 1].key);
                              }}
                              className="p-1 text-slate-450 hover:text-slate-850 bg-slate-50 rounded hover:bg-slate-100 text-[9px] font-bold"
                              title="Shift stage backward"
                            >
                              ◀
                            </button>
                          )}
                          {/* Right Arrow index increments */}
                          {stg.key !== DealStage.LOST && stg.key !== DealStage.WON && (
                            <button
                              onClick={() => {
                                const index = stages.findIndex((s) => s.key === stg.key);
                                if (index < stages.length - 1) handleMoveStage(d.id, stages[index + 1].key);
                              }}
                              className="p-1 px-1.5 text-slate-450 hover:text-indigo-650 bg-slate-50 hover:bg-indigo-50 rounded text-[9px] font-bold flex items-center gap-0.5"
                              title="Shift stage forward"
                            >
                              Next ▶
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE DEAL MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Pipeline Deal</h3>
                <p className="text-xs text-slate-450">Seed newly identified sales prospects.</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Deal Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g. Enterprise Platform Deployment"
                  className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Linked Customer Representative *</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setCustomerId(cId);
                    // Match and pre-populate linked companyId
                    const matchingCust = customers.find((c) => c.id === cId);
                    if (matchingCust && matchingCust.companyId) {
                      setCompanyId(matchingCust.companyId);
                    }
                  }}
                  className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-slate-50/50"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Estimated Value ($)</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Win Probability (%)</label>
                  <input
                    type="number"
                    value={probability}
                    min="0"
                    max="100"
                    onChange={(e) => setProbability(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Initial Pipeline Stage</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as DealStage)}
                  className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-slate-50/50"
                >
                  {stages.map((stg) => (
                    <option key={stg.key} value={stg.key}>
                      {stg.label}
                    </option>
                  ))}
                </select>
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
                  Register Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
