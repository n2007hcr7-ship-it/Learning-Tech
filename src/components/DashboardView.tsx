/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  ArrowRight,
  Plus,
  Clock,
  ChevronRight,
  Briefcase
} from "lucide-react";
import { CustomerStatus, DealStage, TaskStatus, TaskPriority } from "../types.js";

interface DashboardViewProps {
  metrics: any;
  upcomingTasks: any[];
  recentActivities: any[];
  userProfile: any;
  orgDetails: any;
  onNavigate: (tab: string) => void;
  onAddTaskQuick: () => void;
}

export default function DashboardView({
  metrics = {},
  upcomingTasks = [],
  recentActivities = [],
  userProfile,
  orgDetails,
  onNavigate,
  onAddTaskQuick
}: DashboardViewProps) {
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);

  const stats = [
    {
      title: "Total Customers",
      value: metrics.totalCustomers ?? 0,
      sub: `${metrics.activeCustomers ?? 0} active contacts`,
      icon: Users,
      color: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/35"
    },
    {
      title: "SaaS Revenue",
      value: `$${(metrics.revenue ?? 0).toLocaleString()}`,
      sub: `Across billed invoices`,
      icon: DollarSign,
      color: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/35"
    },
    {
      title: "Open Opportunities",
      value: metrics.openDealsCount ?? 0,
      sub: `Value: $${(metrics.openDealsValue ?? 0).toLocaleString()}`,
      icon: Briefcase,
      color: "from-indigo-500 to-purple-600",
      bg: "bg-indigo-50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-900/35"
    },
    {
      title: "Conversion Target",
      value: `${metrics.conversionRate ?? 0}%`,
      sub: "Win deal ratio forecast",
      icon: TrendingUp,
      color: "from-amber-500 to-orange-600",
      bg: "bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/35"
    }
  ];

  // Pure SVG Area Chart details for Sales Trend
  const chartData = metrics.monthlySales || [
    { month: "Jan", sales: 11000, target: 20000 },
    { month: "Feb", sales: 15500, target: 25000 },
    { month: "Mar", sales: 24000, target: 30000 },
    { month: "Apr", sales: 28000, target: 35000 },
    { month: "May", sales: 34500, target: 40000 },
    { month: "Jun", sales: 39000, target: 45000 },
  ];

  const maxVal = Math.max(...chartData.map((d: any) => Math.max(d.sales, d.target))) * 1.15;
  const width = 600;
  const height = 180;
  const padding = 40;

  // Compute SVG point paths
  const points = chartData.map((d: any, i: number) => {
    const x = padding + (i * (width - padding * 2)) / (chartData.length - 1);
    const y = height - padding - (d.sales * (height - padding * 2)) / maxVal;
    return { x, y, label: d.month, value: d.sales };
  });

  const targetPoints = chartData.map((d: any, i: number) => {
    const x = padding + (i * (width - padding * 2)) / (chartData.length - 1);
    const y = height - padding - (d.target * (height - padding * 2)) / maxVal;
    return { x, y };
  });

  const areaPath = points.length > 0 
    ? `${points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` 
    : '';

  const linePath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  const targetLinePath = targetPoints.length > 0
    ? targetPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  return (
    <div className="space-y-6">
      {/* Prime Header Dashboard row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <span className="text-xs font-semibold text-indigo-600 block uppercase tracking-wider mb-1">
            Enterprise Sales Engine
          </span>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
            Welcome back, {userProfile?.firstName || "Sales Lead"}!
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            You are operating in the <span className="font-medium text-slate-700">{orgDetails?.name}</span> Workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("pipeline")}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            View Pipelines
          </button>
          <button
            onClick={() => onNavigate("customers")}
            className="px-4 py-2 text-xs font-medium bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Grid blocks for key metrics counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl border ${s.bg} flex items-center justify-between shadow-sm hover:scale-[1.01] transition-transform`}
            >
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">{s.title}</span>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">{s.value}</p>
                <p className="text-[11px] text-slate-450">{s.sub}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${s.color} text-white shadow-md`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Area Trend Chart Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5 mb-0.5">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                SaaS Revenue Trend & Target Tracker
              </h2>
              <span className="text-xs text-slate-400">Comparing won contracts against targeted revenue goals.</span>
            </div>
            {/* Legend indicators */}
            <div className="flex items-center gap-3.5 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block"></span>
                Won Sales
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2 rounded-full border-t border-slate-350 border-dashed inline-block"></span>
                Target Line
              </span>
            </div>
          </div>

          {/* SVG Area Line Chart Container */}
          <div className="relative w-full h-[200px] bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-center">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, gridIdx) => {
                const y = padding + ratio * (height - padding * 2);
                const valueLine = Math.round(maxVal * (1 - ratio));
                return (
                  <g key={gridIdx}>
                    <line
                      x1={padding}
                      y1={y}
                      x2={width - padding}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeWidth="0.8"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding - 8}
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="Arial"
                      textAnchor="end"
                    >
                      ${valueLine >= 1000 ? `${(valueLine / 1000).toFixed(0)}k` : valueLine}
                    </text>
                  </g>
                );
              })}

              {/* Area Shading */}
              <path d={areaPath} fill="url(#blue-gradient)" opacity="0.12" />

              {/* Target Dashed Line */}
              <path
                d={targetLinePath}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.65"
              />

              {/* Core Sales Trend Path */}
              <path
                d={linePath}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Data Dots & Hover Labels */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredChartIndex === idx ? "6" : "4"}
                    fill={hoveredChartIndex === idx ? "#4f46e5" : "#818cf8"}
                    stroke="#ffffff"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredChartIndex(idx)}
                    onMouseLeave={() => setHoveredChartIndex(null)}
                    style={{ cursor: "pointer", transition: "all 0.15s" }}
                  />
                  {/* Month Label */}
                  <text
                    x={p.x}
                    y={height - 12}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="Arial"
                    textAnchor="middle"
                  >
                    {p.label}
                  </text>

                  {/* Tooltip on element hover */}
                  {hoveredChartIndex === idx && (
                    <g>
                      <rect
                        x={p.x - 38}
                        y={p.y - 28}
                        width="76"
                        height="18"
                        rx="4"
                        fill="#0f172a"
                        shadow-md="true"
                      />
                      <text
                        x={p.x}
                        y={p.y - 16}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="Arial"
                        textAnchor="middle"
                      >
                        ${p.value.toLocaleString()}
                      </text>
                    </g>
                  )}
                </g>
              ))}

              {/* Gradient Shading Definition */}
              <defs>
                <linearGradient id="blue-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Win Ratio & Opportunity Funnel Visualization */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
              Sales Win Funnel Score
            </h2>
            <span className="text-xs text-slate-450 block mb-4">Win ratio efficiency.</span>
          </div>

          <div className="flex flex-col items-center justify-center space-y-4">
            {/* SVG custom gauge conversion chart circular metric */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background base circle line */}
                <circle
                  cx="72"
                  cy="72"
                  r="56"
                  stroke="#f1f5f9"
                  strokeWidth="11"
                  fill="transparent"
                />
                {/* Percentage completed won arc line with rounded points */}
                <circle
                  cx="72"
                  cy="72"
                  r="56"
                  stroke="#10b981"
                  strokeWidth="11"
                  fill="transparent"
                  strokeDasharray={351.8}
                  strokeDashoffset={351.8 - (351.8 * (metrics.conversionRate ?? 65)) / 100}
                  strokeLinecap="round"
                />
              </svg>
              {/* Centered label */}
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold text-slate-900">{metrics.conversionRate ?? 65}%</span>
                <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-widest mt-0.5">Win Rate</p>
              </div>
            </div>

            {/* Funnel layers */}
            <div className="w-full text-xs space-y-2 font-medium">
              <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100">
                <span className="text-slate-500">Deals Closed Won</span>
                <span className="font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
                  {metrics.closedDealsCount ?? 3} Won
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500">Team Conversion Grade</span>
                <span className="text-slate-700 font-bold">
                  {(metrics.conversionRate ?? 65) >= 60 ? "Excellent" : "Standard"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming tasks & activities log container row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Assignments block */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-50">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4.5 h-4.5 text-indigo-500" />
                Active Sales Reminders ({upcomingTasks.length})
              </h2>
              <p className="text-xs text-slate-450">Pending assignments prioritized.</p>
            </div>
            <button
              onClick={onAddTaskQuick}
              className="text-xs text-indigo-650 font-bold hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Quick Task
            </button>
          </div>

          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {upcomingTasks.length === 0 ? (
              <div className="py-10 text-center space-y-1.5">
                <p className="text-sm font-medium text-slate-450">All assignments complete! 🎉</p>
                <p className="text-xs text-slate-400">Create standard tasks to set customer reminders.</p>
              </div>
            ) : (
              upcomingTasks.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-slate-200 transition-colors flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-850 leading-snug">{t.title}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{t.description}</p>
                    {t.customer && (
                      <span className="inline-block mt-1 text-[10px] text-indigo-650 bg-indigo-50/70 border border-indigo-100 px-2 py-0.5 rounded-full">
                        👤 {t.customer.firstName} {t.customer.lastName}
                      </span>
                    )}
                  </div>

                  <div className="text-right space-y-1.5 shrink-0">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === TaskPriority.HIGH
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : t.priority === TaskPriority.MEDIUM
                          ? "bg-amber-50 text-amber-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {t.priority}
                    </span>
                    <p className="text-[10px] text-slate-450 flex items-center justify-end gap-1 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(t.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AuditLogs / Activities tracking */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-50">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Activity className="w-4.5 h-4.5 text-indigo-500" />
                Live Workspace Logs
              </h2>
              <p className="text-xs text-slate-450">Chronological activity audit trails.</p>
            </div>
            <button
              onClick={() => onNavigate("customers")}
              className="text-xs text-slate-400 hover:text-indigo-650 flex items-center gap-0.5 cursor-pointer"
            >
              Details <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {recentActivities.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-450">
                No custom activities logged yet on this tenant frame.
              </div>
            ) : (
              recentActivities.map((a: any) => (
                <div key={a.id} className="flex gap-3 text-xs">
                  <div className="relative flex flex-col items-center shrink-0">
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-1.5 rounded-full border border-indigo-100">
                      <Activity className="w-3 h-3 text-indigo-500" />
                    </div>
                    <div className="w-0.5 bg-slate-100 grow mt-1.5"></div>
                  </div>
                  <div className="space-y-0.5 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{a.userName}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-100/70 py-0.5 px-1.5 rounded">
                        {a.action}
                      </span>
                    </div>
                    <p className="text-slate-650 leading-relaxed text-[11px]">{a.details}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {new Date(a.timestamp).toLocaleString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
