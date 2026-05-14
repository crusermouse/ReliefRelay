"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { CheckCircle2, AlertCircle, Loader2, Brain, Search, Wrench, FileText, Database } from "lucide-react";
import type { WorkflowEvent } from "@/lib/types";

export type LoadingStep = "idle" | "extracting" | "retrieving" | "running_agent" | "done";

interface LiveReasoningTimelineProps {
  loadingStep: LoadingStep;
  isLoading: boolean;
  events: WorkflowEvent[];
}

const EVENT_META: Record<string, { label: string; icon: typeof CheckCircle2; desc: string }> = {
  extraction:         { label: "Field extraction",    icon: Brain,     desc: "Gemma 4 vision parsed the intake form" },
  retrieval:          { label: "Policy retrieval",    icon: Search,    desc: "ChromaDB matched top-4 SOP chunks" },
  "tool-calling":     { label: "Tool orchestration",  icon: Wrench,    desc: "Native function calling executed" },
  "packet-generation":{ label: "Action packet",       icon: FileText,  desc: "Grounded action plan generated" },
  persistence:        { label: "Case persisted",      icon: Database,  desc: "Record saved to local SQLite" },
};

const STATUS_STYLE = {
  complete: { row: "border-emerald-400/25 bg-emerald-500/[0.06]", icon: "text-emerald-300", text: "text-emerald-200", dot: "bg-emerald-400" },
  fallback:  { row: "border-amber-400/30 bg-amber-500/[0.07]",    icon: "text-amber-300",   text: "text-amber-100",  dot: "bg-amber-400"   },
  failed:    { row: "border-rose-400/30 bg-rose-500/[0.07]",      icon: "text-rose-300",    text: "text-rose-100",   dot: "bg-rose-400"    },
  active:    { row: "border-cyan-400/30 bg-cyan-500/[0.07]",      icon: "text-cyan-300",    text: "text-cyan-100",   dot: "bg-cyan-400"    },
  idle:      { row: "border-white/[0.06] bg-white/[0.02]",        icon: "text-gray-600",    text: "text-gray-500",   dot: "bg-gray-700"    },
};

// Pre-flight stages shown while loading before backend responds
const PREFLIGHT = [
  { stage: "upload",    label: "Intake accepted",          icon: Database, color: "from-cyan-400/60 to-cyan-400/30" },
  { stage: "sending",   label: "Routing to Gemma 4…",      icon: Brain,    color: "from-blue-400/60 to-blue-400/30" },
  { stage: "rag",       label: "Loading retrieval index…", icon: Search,   color: "from-purple-400/60 to-purple-400/30" },
];

function PreflightRow({ stage, label, Icon, idx, total }: { stage: string; label: string; Icon: typeof Brain; idx: number; total: number }) {
  const isActive = idx === 0;
  const isComplete = idx === 0;
  const stageColor = PREFLIGHT[idx]?.color || "from-cyan-400/60 to-cyan-400/30";
  const progressPercent = ((idx + 1) / total) * 100;
  
  return (
    <motion.div
      key={stage}
      initial={{ opacity: 0, y: 8, x: -6 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ delay: idx * 0.12, duration: 0.35 }}
      className="space-y-1.5"
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ delay: idx * 0.12 + 0.1, duration: 0.5 }}
          className={`h-full bg-gradient-to-r ${stageColor} rounded-full`}
        />
      </div>
      
      {/* Stage row */}
      <div className="flex items-center gap-3 rounded-lg border border-cyan-400/25 bg-gradient-to-r from-cyan-500/[0.08] to-blue-500/[0.04] px-3 py-2.5 group hover:border-cyan-400/40 transition-colors">
        <div className="relative flex-shrink-0">
          {isActive ? (
            <motion.div
              animate={{ scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
            />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/40" />
          )}
        </div>
        <Icon className={clsx("w-4 h-4 flex-shrink-0 transition-colors", isActive ? "text-cyan-300" : "text-cyan-400/50")} />
        <span className={clsx("text-xs font-mono font-semibold transition-colors", isActive ? "text-cyan-200" : "text-cyan-300/70")}>
          {label}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[8px] font-mono text-gray-600">{progressPercent.toFixed(0)}%</span>
          <Loader2 className={clsx("w-3 h-3 flex-shrink-0 transition-all", isActive ? "text-cyan-400 animate-spin" : "text-cyan-400/30")} />
        </div>
      </div>
    </motion.div>
  );
}

export function LiveReasoningTimeline({ loadingStep, isLoading, events }: LiveReasoningTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [events.length]);

  const showPreflight = isLoading && events.length === 0;

  return (
    <section className="glass-panel terminal-grid rounded-2xl p-4 md:p-5 relative overflow-hidden">
      {/* Scan line for cinematic feel */}
      {isLoading && <div className="scan-line absolute inset-0 pointer-events-none rounded-2xl" />}

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Live AI Reasoning</h3>
          {showPreflight && (
            <motion.span 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-[9px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-400/30"
            >
              {events.length}/{PREFLIGHT.length} stages
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border border-cyan-400/30 rounded-full px-3 py-1.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <span className="text-[9px] font-mono text-cyan-300 tracking-widest font-semibold">PROCESSING</span>
            </motion.div>
          )}
          {!isLoading && (
            <span className="text-[9px] md:text-[10px] font-mono text-gray-600 tracking-widest">
              {events.length > 0 ? "✓ COMPLETE · LOCAL INFERENCE" : "⊙ READY · LOCAL INFERENCE"}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 relative z-10">
        <AnimatePresence initial={false}>
          {showPreflight ? (
            PREFLIGHT.map((p, idx) => (
              <PreflightRow key={p.stage} stage={p.stage} label={p.label} Icon={p.icon} idx={idx} total={PREFLIGHT.length} />
            ))
          ) : (
            events.map((event, idx) => {
              const isActive = isLoading && idx === events.length - 1 && event.status !== "failed";
              const statusKey = isActive ? "active" : (event.status as keyof typeof STATUS_STYLE) ?? "idle";
              const style = STATUS_STYLE[statusKey] ?? STATUS_STYLE.idle;
              const meta = EVENT_META[event.stage];
              const Icon = isActive ? Loader2 : event.status === "complete" ? CheckCircle2 : AlertCircle;

              return (
                <motion.div
                  key={`${event.stage}-${idx}`}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.28, delay: Math.min(idx * 0.05, 0.25) }}
                  className={clsx("flex items-center gap-3 rounded-lg border px-3 py-2.5", style.row)}
                >
                  {/* Status dot */}
                  <div className="relative flex-shrink-0">
                    <div className={clsx("w-1.5 h-1.5 rounded-full", style.dot)} />
                    {isActive && (
                      <div className={clsx("absolute inset-0 rounded-full animate-ping opacity-60", style.dot)} />
                    )}
                  </div>

                  <Icon className={clsx("w-3.5 h-3.5 flex-shrink-0", style.icon, isActive && "animate-spin")} />

                  <div className="flex-1 min-w-0">
                    <span className={clsx("text-xs font-mono", style.text)}>
                      {meta?.label ?? event.stage.replace(/-/g, " ")}
                    </span>
                    {meta?.desc && !isActive && (
                      <p className="text-[10px] text-gray-600 mt-0.5 truncate">{meta.desc}</p>
                    )}
                  </div>

                  {event.status === "complete" && (
                    <span className="text-[9px] font-mono text-emerald-600 flex-shrink-0">DONE</span>
                  )}
                  {event.status === "fallback" && (
                    <span className="text-[9px] font-mono text-amber-600 flex-shrink-0">FALLBACK</span>
                  )}
                </motion.div>
              );
            })
          )}

          {/* Awaiting confirmation row */}
          {isLoading && events.length > 0 && loadingStep !== "done" && (
            <motion.div
              key="awaiting"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-lg border border-cyan-400/15 bg-cyan-500/[0.04] px-3 py-2"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400/60 flex-shrink-0" />
              <span className="text-xs font-mono text-cyan-400/60">Awaiting backend confirmation…</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
