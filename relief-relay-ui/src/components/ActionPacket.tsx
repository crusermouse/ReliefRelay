"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FileDown, ClipboardList, CheckCircle2, Clock } from "lucide-react";
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

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-4">
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
        </div>
        {case_id && (
          <button
            onClick={handleDownload}
            aria-label={`Download PDF referral packet for case ${case_id}`}
            className="flex items-center gap-1.5 bg-blue-600/15 hover:bg-blue-600/25 active:scale-95 text-blue-300 border border-blue-500/25 text-xs px-3 py-1.5 rounded-lg transition-all duration-150 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          >
            <FileDown className="w-3.5 h-3.5 flex-shrink-0" />
            Export PDF
          </button>
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
