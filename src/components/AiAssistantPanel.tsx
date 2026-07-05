/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Loader,
  Copy,
  Check,
  Send,
  AlertCircle,
  Clock,
  RefreshCw,
  Mail,
  ShieldAlert,
  BrainCircuit,
  MessageSquare,
  Bookmark
} from "lucide-react";

interface AiAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  aiType: "summary" | "insights" | "email" | "general";
  aiContext: any; // Context payload passed from caller (Customer or Deal item object)
  tenantId: string;
  userId: string;
}

export default function AiAssistantPanel({
  isOpen,
  onClose,
  aiType,
  aiContext,
  tenantId,
  userId
}: AiAssistantPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseContent, setResponseContent] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isMocked, setIsMocked] = useState(false);

  // Trigger analysis load whenever panel opens or type shifts
  useEffect(() => {
    if (isOpen && aiContext) {
      triggerAnalysis();
    }
  }, [isOpen, aiType, aiContext]);

  const triggerAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResponseContent("");
    setIsCopied(false);

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": tenantId,
          "X-User-Id": userId
        },
        body: JSON.stringify({
          type: aiType,
          context: aiContext
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned error status code: ${res.status}`);
      }

      const data = await res.json();
      setResponseContent(data.content || "AI generation completed but response text empty.");
      setIsMocked(!!data.isMocked);
    } catch (e: any) {
      console.error("AI Generation error on frontend side:", e);
      setError(e.message || "Something went wrong during generation.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(responseContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Elite custom Markdown parsing renderer helper (zero dependencies, converts basic markdown lists/bold asterisks into styled divs!)
  const renderFormattedText = (rawStr: string) => {
    if (!rawStr) return null;
    const lines = rawStr.split("\n");
    return lines.map((line, idx) => {
      // Check for bullet highlights
      if (line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("* ")) {
        const text = line.replace(/^[•\-\*]\s*/, "");
        return (
          <div key={idx} className="flex gap-2 text-xs text-slate-705 py-1">
            <span className="text-indigo-605 text-indigo-500 font-bold shrink-0">•</span>
            <span className="leading-relaxed">{parseFormatInside(text)}</span>
          </div>
        );
      }
      // Check for subject headers, email formatting
      if (line.trim().startsWith("Subject:") || line.trim().startsWith("SUBJECT:")) {
        return (
          <div key={idx} className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg text-xs font-bold text-slate-900 border-l-4 border-l-indigo-500 mb-3 select-all">
            {line}
          </div>
        );
      }
      return <p key={idx} className="text-xs text-slate-700 leading-relaxed py-1 min-h-[1.5rem]">{parseFormatInside(line)}</p>;
    });
  };

  // Simple inner parse formatting (converts text flanked in ** into strong tags)
  const parseFormatInside = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-extrabold text-slate-950">{part}</strong>;
      }
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-end z-50 transition-all">
      {/* Click-outside backdrop closer */}
      <div className="absolute inset-0 z-10" onClick={onClose} />

      {/* Main Slide Panel */}
      <div className="relative z-20 bg-white shadow-2xl h-full w-full max-w-lg flex flex-col justify-between border-l border-slate-100 p-6 animate-slide-in">
        {/* Panel Header */}
        <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-150 shadow-sm animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-950 text-sm flex items-center gap-1.5 capitalize">
                Gemini AI Sales Advisor
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold tracking-wide uppercase">
                  {aiType}
                </span>
              </h3>
              <p className="text-slate-450 text-[11px]">Real-time forecasting heuristics analysis context.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-650 font-bold hover:bg-slate-50 p-1.5 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="grow overflow-y-auto py-5 space-y-4">
          {/* Target analyzed entity reference details header card */}
          {aiContext && (
            <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-xs space-y-1 relative">
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide">
                Target Entity Segment
              </span>
              <p className="font-extrabold text-slate-900 text-sm leading-none">
                {aiType === "insights" ? `💼 Opportunity: ${aiContext.name}` : `👤 Profile: ${aiContext.firstName} ${aiContext.lastName}`}
              </p>
              {aiContext.email && <p className="text-[11px] text-slate-500 font-mono">{aiContext.email}</p>}
              {aiContext.value && <p className="text-xs text-indigo-650 font-bold">Value contract: ${aiContext.value?.toLocaleString()}</p>}
            </div>
          )}

          {/* Core Response Window Container */}
          <div className="min-h-[220px] bg-slate-50 border border-slate-150 rounded-xl p-5 relative select-text">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 p-10 text-center animate-fade-in bg-slate-50/80 rounded-xl">
                <Loader className="w-8 h-8 text-indigo-605 animate-spin text-indigo-600" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400">Synthesizing CRM context profiles...</p>
                  <p className="text-[10px] text-slate-450 italic">Formulating structural recommendations via Gemini 3.5...</p>
                </div>
              </div>
            ) : error ? (
              <div className="py-8 text-center text-rose-600 space-y-2">
                <ShieldAlert className="w-8 h-8 mx-auto text-rose-500" />
                <p className="font-semibold text-xs">{error}</p>
                <button
                  onClick={triggerAnalysis}
                  className="text-xs font-bold text-indigo-650 underline hover:text-indigo-800"
                >
                  Retry request
                </button>
              </div>
            ) : (
              <div className="space-y-2 animate-fade-in select-text">
                {renderFormattedText(responseContent)}
              </div>
            )}
          </div>

          {/* AI Info details banner */}
          {!loading && !error && isMocked && (
            <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-xl space-y-1 text-[11px] text-amber-900 animate-fade-in">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Simulation Notice
              </p>
              <p className="text-amber-800 leading-snug">
                This analysis utilizes a highly accurate localized business heuristics generator. To unlock full real-time model synthesis on live contacts, connect a valid Google GenAI API secret token in the workspaceSecrets side drawer panel.
              </p>
            </div>
          )}
        </div>

        {/* Panel Footer Toolbar */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={triggerAnalysis}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-105 rounded-xl border border-slate-200 text-slate-650 hover:text-slate-850 cursor-pointer text-xs font-medium flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-Analyze
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              disabled={loading || !responseContent}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-605 border border-slate-200 hover:text-slate-850 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Text
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
