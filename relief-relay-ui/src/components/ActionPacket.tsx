"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FileDown, ClipboardList, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { getPdfUrl } from "@/lib/api";
import type { IntakeResponse } from "@/lib/types";

interface ActionPacketProps {
  result: IntakeResponse;
}

const STAGES = ["extraction", "retrieval", "tool-calling", "packet-generation"] as const;

const STAGE_LABELS: Record<string, string> = {
  extraction:         "Field extraction",
  retrieval:          "Policy retrieval",
  "tool-calling":     "Tool orchestration",
  "packet-generation":"Action packet",
};

export function ActionPacket({ result }: ActionPacketProps) {
  const reduceMotion = useReducedMotion();
  const { action_plan, case_id, resources, workflow_events } = result;

  const handleDownload = () => {
    if (!case_id) return;
    window.open(getPdfUrl(case_id), "_blank", "noopener,noreferrer");
  };

  const resourceList = useMemo<Array<Record<string, unknown>>>(() => {
    if (Array.isArray(resources)) return resources as Array<Record<string, unknown>>;
    return Object.values(resources ?? {}).flat() as Array<Record<string, unknown>>;
  }, [resources]);

  const planText = useMemo(() => action_plan ?? "", [action_plan]);
  const packetReady = workflow_events?.some(
    (e) => e.stage === "packet-generation" && e.status !== "failed",
  );
  
  const hasFailedStage = workflow_events?.some((e) => e.status === "failed");
  const usingFallback = workflow_events?.some((e) => e.status === "fallback");

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-4">
      {/* Degradation warning if fallback is active */}
      {usingFallback && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-3"
        >
          <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-200">⚠️ Offline Mode Active</p>
            <p className="text-xs text-amber-100/70 mt-1">
              Gemma 4 is unavailable. Using cached template for action plan. Complete intake form manually if possible.
            </p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-white">Action Packet</h3>
          {packetReady && (
            <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full tracking-widest">
              READY
            </span>
          )}
          {usingFallback && (
            <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full tracking-widest">
              FALLBACK
            </span>
          )}
        </div>
        {case_id && (
          <motion.button
            onClick={handleDownload}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Download PDF referral packet for case ${case_id}`}
            className="flex items-center justify-center md:justify-start gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 active:scale-95 text-white border border-blue-400/50 text-xs md:text-sm px-4 py-2.5 md:py-2 rounded-lg md:rounded-xl transition-all duration-150 font-bold shadow-lg shadow-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 min-h-[44px] md:min-h-auto"
          >
            <FileDown className="w-4 h-4 md:w-4 md:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">Export</span>
          </motion.button>
        )}
      </div>

      {/* Packet Assembly Stages */}
      <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/[0.04] p-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/80 mb-2.5 font-mono">Packet Assembly</p>
        <div className="grid grid-cols-2 gap-1.5">
          {STAGES.map((stage, idx) => {
            const event = workflow_events?.find((e) => e.stage === stage);
            const completed = event?.status === "complete" || event?.status === "fallback";
            return (
              <motion.div
                key={stage}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: completed ? 1 : 0.5, scale: 1 }}
                transition={{ delay: idx * 0.06 }}
                className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-2 flex items-center gap-1.5"
              >
                {completed
                  ? <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  : <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
                }
                <span className="text-[10px] text-gray-300 leading-tight">{STAGE_LABELS[stage]}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Action Plan Text */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 max-h-64 overflow-y-auto">
        {planText ? (
          <div className="space-y-1.5">
            {planText.split("\n").map((line, i) =>
              line.trim() ? (
                <p key={i} className="text-[13px] text-gray-300 leading-relaxed">
                  {line}
                </p>
              ) : (
                <div key={i} className="h-1.5" />
              ),
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-600 italic">No action plan generated yet.</p>
        )}
      </div>

      {/* PDF Export Preview */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-300 font-medium">Operational Referral Packet</p>
          <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">Print-ready export with SOP citations and response chain.</p>
        </div>
        {/* QR placeholder */}
        <div className="w-11 h-11 rounded-lg grid grid-cols-3 gap-[2px] p-1.5 bg-white/90 flex-shrink-0" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className={[0, 2, 4, 6, 8].includes(i) ? "bg-gray-900 rounded-[1px]" : "bg-transparent"} />
          ))}
        </div>
      </div>

      {/* Resources */}
      {resourceList.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Resources Found</p>
          <div className="space-y-2">
            {resourceList.slice(0, 3).map((r, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                <p className="text-xs font-medium text-gray-200">{String(r.name ?? "Resource")}</p>
                {r.address != null && (
                  <p className="text-[11px] text-gray-500 mt-0.5">{String(r.address)}</p>
                )}
                {r.phone != null && (
                  <p className="text-[11px] text-blue-400 mt-1 font-mono">{String(r.phone)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
