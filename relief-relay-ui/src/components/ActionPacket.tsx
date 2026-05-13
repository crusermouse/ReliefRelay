"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileDown, ClipboardList } from "lucide-react";
import { getPdfUrl } from "@/lib/api";
import type { IntakeResponse } from "@/lib/types";

interface ActionPacketProps {
  result: IntakeResponse;
}

export function ActionPacket({ result }: ActionPacketProps) {
  const { action_plan, case_id, resources } = result;
  const [assemblyStep, setAssemblyStep] = useState(0);
  const [visibleChars, setVisibleChars] = useState(200);

  const handleDownload = () => {
    if (!case_id) return;
    const url = getPdfUrl(case_id);
    window.open(url, "_blank");
  };

  const resourceList = Array.isArray(resources)
    ? (resources as Array<Record<string, unknown>>)
    : Object.values(resources ?? {}).flat() as Array<Record<string, unknown>>;
  const planText = useMemo(() => action_plan ?? "", [action_plan]);

  useEffect(() => {
    const t0 = window.setTimeout(() => setAssemblyStep(0), 0);
    const t1 = window.setTimeout(() => setAssemblyStep(1), 420);
    const t2 = window.setTimeout(() => setAssemblyStep(2), 900);
    const t3 = window.setTimeout(() => setAssemblyStep(3), 1320);
    return () => [t0, t1, t2, t3].forEach((t) => window.clearTimeout(t));
  }, [case_id]);

  useEffect(() => {
    const reset = window.setTimeout(() => setVisibleChars(200), 0);
    const timer = window.setInterval(() => {
      setVisibleChars((v) => Math.min(planText.length, v + 38));
    }, 35);
    return () => {
      window.clearTimeout(reset);
      window.clearInterval(timer);
    };
  }, [planText.length]);

  return (
    <div className="glass-panel rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Action Packet</h3>
        </div>
        {case_id && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export PDF
          </button>
        )}
      </div>

      <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/[0.05] p-3">
        <p className="text-[11px] uppercase tracking-[0.15em] text-cyan-300 mb-2">Packet Assembly</p>
        <div className="grid grid-cols-2 gap-2">
          {["Case summary", "Risk triage", "Resource routing", "Print dossier"].map((step, idx) => (
            <motion.div key={step} initial={{ opacity: 0.4 }} animate={{ opacity: assemblyStep > idx ? 1 : 0.5 }} className="rounded border border-white/10 bg-white/[0.03] px-2 py-1.5 text-xs text-gray-200">
              {assemblyStep > idx ? "✓ " : "… "}
              {step}
            </motion.div>
          ))}
        </div>
        {assemblyStep > 2 && <p className="text-xs text-emerald-200 mt-2">Emergency Packet Ready</p>}
      </div>

      <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4">
        <div className="prose prose-sm prose-invert max-w-none">
          {planText
            ? planText.slice(0, visibleChars).split("\n").map((line, i) => (
                line.trim() ? (
                  <p key={i} className="text-sm text-gray-300 leading-relaxed mb-2 last:mb-0">
                    {line}
                  </p>
                ) : (
                  <div key={i} className="h-2" />
                )
              ))
            : <p className="text-sm text-gray-500 italic">No action plan generated</p>}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-300">Operational dossier preview</p>
          <p className="text-[11px] text-gray-500 mt-1">Print-ready export with response chain and SOP citations.</p>
        </div>
        <div className="w-12 h-12 rounded grid grid-cols-4 gap-[2px] p-1 bg-white/95">
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} className={i % 3 === 0 || i === 5 || i === 10 ? "bg-black rounded-[1px]" : "bg-transparent"} />
          ))}
        </div>
      </div>

      {/* Resources found */}
      {resourceList.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Resources Found</p>
          <div className="space-y-2">
            {(resourceList as Array<Record<string, unknown>>).slice(0, 3).map((r, i) => (
              <div
                key={i}
                className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3"
              >
                <p className="text-xs font-medium text-gray-200">{String(r.name ?? "Resource")}</p>
                <p className="text-xs text-gray-500 mt-0.5">{String(r.address ?? "")}</p>
                {r.phone !== undefined && r.phone !== null && (
                  <p className="text-xs text-blue-400 mt-1 font-mono">{String(r.phone)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
