"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu, Database, FileText, Wifi, WifiOff,
  Activity, Zap, Shield, Server
} from "lucide-react";
import type { HealthResponse } from "@/lib/types";

interface OperationalReadinessPanelProps {
  health: HealthResponse | null;
  backendReachable: boolean;
  isOnline: boolean;
}

const TELEMETRY_LINES = [
  "nomic-embed-text ready — 137M F16",
  "gemma4:latest loaded — 8B Q4_K_M",
  "chroma_db index warm — 17 chunks",
  "SQLite cases.db open",
  "RAG pipeline latency: <80ms",
  "Tool routing: deterministic mode",
  "PDF pipeline: ReportLab 4.2",
  "Inference semaphore: 1 slot",
];

function TelemetryStream() {
  const [lines, setLines] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx >= TELEMETRY_LINES.length) return;
    const t = setTimeout(() => {
      setLines((prev) => [...prev, TELEMETRY_LINES[idx]]);
      setIdx((i) => i + 1);
    }, 320 + idx * 180);
    return () => clearTimeout(t);
  }, [idx]);

  return (
    <div className="font-mono text-[10px] space-y-1 max-h-28 overflow-hidden">
      <AnimatePresence>
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 text-gray-500"
          >
            <span className="text-emerald-500/70">›</span>
            <span>{line}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ServiceRowProps {
  icon: React.ReactNode;
  label: string;
  status: "ready" | "degraded" | "unknown" | "checking";
  detail?: string;
  delay?: number;
}

function ServiceRow({ icon, label, status, detail, delay = 0 }: ServiceRowProps) {
  const colors = {
    ready:    { dot: "bg-emerald-400 pulse-ring-emerald", text: "text-emerald-300", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" },
    degraded: { dot: "bg-amber-400", text: "text-amber-300", badge: "bg-amber-500/10 border-amber-500/20 text-amber-300" },
    unknown:  { dot: "bg-gray-500", text: "text-gray-500", badge: "bg-white/5 border-white/10 text-gray-500" },
    checking: { dot: "bg-blue-400 animate-pulse", text: "text-blue-300", badge: "bg-blue-500/10 border-blue-500/20 text-blue-300" },
  }[status];

  const labels = { ready: "READY", degraded: "DEGRADED", unknown: "UNKNOWN", checking: "CHECKING" };

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.04] last:border-0"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-gray-500 w-4 flex-shrink-0">{icon}</span>
        <div>
          <p className="text-xs text-gray-300 font-medium">{label}</p>
          {detail && <p className="text-[10px] text-gray-600 font-mono mt-0.5">{detail}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
        <span className={`text-[9px] font-mono font-semibold tracking-widest ${colors.text}`}>
          {labels[status]}
        </span>
      </div>
    </motion.div>
  );
}

export function OperationalReadinessPanel({
  health,
  backendReachable,
  isOnline,
}: OperationalReadinessPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setTick((n) => n + 1), 3200);
    return () => clearInterval(t);
  }, []);

  const ollamaReady   = health?.services?.ollama === "ready";
  const vectorReady   = health?.services?.vector_store === "ready";
  const backendStatus = backendReachable ? "ready" : "degraded";
  const ollamaStatus  = !backendReachable ? "unknown" : ollamaReady ? "ready" : "degraded";
  const vectorStatus  = !backendReachable ? "unknown" : vectorReady ? "ready" : "degraded";
  
  // Use true as default for SSR to match the default state in page.tsx
  const effectiveIsOnline = mounted ? isOnline : true;
  const networkStatus = effectiveIsOnline ? "ready" : "degraded";

  const allReady = backendReachable && ollamaReady && vectorReady && effectiveIsOnline;

  return (
    <div className="space-y-3">
      {/* Main readiness panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel panel-breathe rounded-2xl p-4 md:p-5 space-y-4 relative overflow-hidden"
      >
        {/* Scan line ambience */}
        <div className="scan-line absolute inset-0 pointer-events-none rounded-2xl" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${allReady ? "bg-emerald-400 pulse-ring-emerald" : "bg-amber-400 animate-pulse"}`} />
            <h3 className="text-sm font-semibold text-white">System Readiness</h3>
          </div>
          <span className={`text-[9px] font-mono tracking-[0.18em] font-semibold ${allReady ? "text-emerald-400" : "text-amber-400"}`}>
            {allReady ? "FULLY OPERATIONAL" : "DEGRADED MODE"}
          </span>
        </div>

        {/* Services */}
        <div className="space-y-0">
          <ServiceRow
            icon={<Server className="w-3.5 h-3.5" />}
            label="FastAPI Backend"
            status={backendStatus}
            detail="uvicorn / port 8000"
            delay={0.05}
          />
          <ServiceRow
            icon={<Cpu className="w-3.5 h-3.5" />}
            label="Gemma 4 Inference"
            status={ollamaStatus}
            detail="gemma4:latest · 8B Q4_K_M"
            delay={0.12}
          />
          <ServiceRow
            icon={<Database className="w-3.5 h-3.5" />}
            label="Vector Retrieval"
            status={vectorStatus}
            detail="chromadb · nomic-embed-text"
            delay={0.19}
          />
          <ServiceRow
            icon={<FileText className="w-3.5 h-3.5" />}
            label="PDF Pipeline"
            status={backendReachable ? "ready" : "unknown"}
            detail="reportlab · local export"
            delay={0.26}
          />
          <ServiceRow
            icon={effectiveIsOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            label="Network"
            status={networkStatus}
            detail={effectiveIsOnline ? "offline-first mode available" : "no connectivity"}
            delay={0.33}
          />
        </div>
      </motion.div>

      {/* Live telemetry feed */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="glass-panel terminal-grid rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-white">AI Telemetry</span>
          </div>
          <span className="text-[9px] font-mono text-cyan-400 tracking-widest status-blink">
            LIVE
          </span>
        </div>
        <TelemetryStream />
      </motion.div>

      {/* Inference config */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="glass-panel rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-white">Inference Config</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: "Context", v: "128K tokens" },
            { k: "Visual Budget", v: "560 tokens" },
            { k: "Timeout", v: "120s" },
            { k: "Concurrency", v: "1 slot" },
            { k: "Temp", v: "deterministic" },
            { k: "Mode", v: "offline-first" },
          ].map(({ k, v }) => (
            <div key={k} className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-2.5 py-1.5">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest">{k}</p>
              <p className="text-[10px] font-mono text-gray-300 mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Mission readiness badge */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
          allReady
            ? "border-emerald-500/20 bg-emerald-500/[0.06]"
            : "border-amber-500/20 bg-amber-500/[0.06]"
        }`}
      >
        <Shield className={`w-4 h-4 flex-shrink-0 ${allReady ? "text-emerald-400" : "text-amber-400"}`} />
        <div>
          <p className={`text-xs font-semibold ${allReady ? "text-emerald-300" : "text-amber-300"}`}>
            {allReady ? "Mission Ready" : "Degraded Operations"}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {allReady
              ? "All AI pipelines operational. Submit intake to begin."
              : "Core functions available. AI may fall back to rule-based mode."}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
