"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";
import { IntakePanel } from "@/components/IntakePanel";
import { TriageCard } from "@/components/TriageCard";
import { EvidenceRail } from "@/components/EvidenceRail";
import { ActionPacket } from "@/components/ActionPacket";
import { CaseList } from "@/components/CaseList";
import { LiveReasoningTimeline, type LoadingStep } from "@/components/LiveReasoningTimeline";
import { OfflineModeOverlay } from "@/components/OfflineModeOverlay";
import { CrisisOperationsMap } from "@/components/CrisisOperationsMap";
import { ImpactDashboard } from "@/components/ImpactDashboard";
import { CaseActivityFeed } from "@/components/CaseActivityFeed";
import { OperationalReadinessPanel } from "@/components/OperationalReadinessPanel";
import { fetchCases, fetchCase, fetchHealth, submitIntake } from "@/lib/api";
import type { IntakeResponse, Case, HealthResponse } from "@/lib/types";

const STEP_LABELS: Record<LoadingStep, string> = {
  idle: "",
  extracting: "Gemma 4 Vision — extracting intake fields…",
  retrieving: "RAG retrieval — matching policy corpus…",
  running_agent: "Agent loop — tool calling + packet assembly…",
  done: "Case processed",
};

const HERO_PILLS = [
  { label: "Field-deployed in <5 minutes", color: "border-cyan-500/20 text-cyan-300 bg-cyan-500/[0.06]" },
  { label: "Zero cloud dependency", color: "border-purple-500/20 text-purple-300 bg-purple-500/[0.06]" },
  { label: "PDF referral in seconds", color: "border-emerald-500/20 text-emerald-300 bg-emerald-500/[0.06]" },
];

function hydrateCaseResponse(caseRecord: Case): IntakeResponse {
  return {
    intake_record: caseRecord.intake_data,
    case_id: caseRecord.case_id,
    action_plan: caseRecord.action_plan ?? "",
    resources: {},
    evidence: [],
    tools_used: [],
    workflow_events: caseRecord.action_plan ? [{ stage: "persistence", status: "complete" }] : [],
    operational_mode: "full",
  };
}

function getStatusText(isOnline: boolean, backendReachable: boolean, health: HealthResponse | null) {
  if (!isOnline) return "Browser offline";
  if (!backendReachable) return "Backend unavailable";
  if (health?.status === "operational") return "Local AI operational";
  if (health?.status === "degraded") return "Degraded mode";
  return "Checking services…";
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [result, setResult] = useState<IntakeResponse | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("idle");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<IntakeResponse | null>(null);
  const [selectedCaseLoading, setSelectedCaseLoading] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendReachable, setBackendReachable] = useState(true);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  const refreshCases = useCallback(async () => {
    try {
      const data = await fetchCases();
      setCases(data.cases);
    } catch { /* keep last list */ }
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
      setBackendReachable(true);
    } catch {
      setBackendReachable(false);
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCases();
      void refreshHealth();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshCases, refreshHealth]);

  useEffect(() => {
    const sync = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) void refreshHealth();
      else setBackendReachable(false);
    };
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [refreshHealth]);

  useEffect(() => {
    if (!selectedCaseId || result?.case_id === selectedCaseId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSelectedCaseLoading(true);
      fetchCase(selectedCaseId)
        .then((c) => { if (!cancelled) setSelectedCase(hydrateCaseResponse(c)); })
        .catch(() => { if (!cancelled) { setSelectedCase(null); toast.error(`Case ${selectedCaseId} could not be loaded.`); } })
        .finally(() => { if (!cancelled) setSelectedCaseLoading(false); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [result, selectedCaseId]);

  const handleSubmit = async (image?: File, voiceText?: string, manualText?: string) => {
    if (!image && !voiceText && !manualText) {
      toast.error("Please provide an image, voice note, or typed text.");
      return;
    }
    try {
      setResult(null);
      setSelectedCase(null);
      setLoadingStep("extracting");
      const data = await submitIntake(image, voiceText, manualText);
      setResult(data);
      setSelectedCaseId(data.case_id ?? null);
      setSelectedCase(data);
      setLoadingStep("done");
      await refreshCases();
      await refreshHealth();
      toast.success(`Case ${data.case_id} created`);
    } catch (err: unknown) {
      setLoadingStep("idle");
      toast.error(err instanceof Error ? err.message : "Intake failed");
    }
  };

  const latestCaseId = result?.case_id ?? selectedCaseId;
  const activeResponse = useMemo(() => (selectedCaseId ? selectedCase ?? result : result), [result, selectedCase, selectedCaseId]);
  const loadingBanner = loadingStep !== "idle" && loadingStep !== "done";
  const statusText = getStatusText(isOnline, backendReachable, health);
  const statusTone = !isOnline || !backendReachable || health?.status === "degraded" ? "amber" : "emerald";

  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <OfflineModeOverlay isOnline={isOnline} backendReachable={backendReachable} health={health} />

      {/* ── HEADER ── */}
      <header className="border-b border-white/[0.07] px-5 md:px-8 py-3.5 flex items-center justify-between backdrop-blur sticky top-0 z-40 bg-[#06090f]/70">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-600/30 border border-cyan-400/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-sm bg-cyan-400/60" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#06090f] status-blink" />
          </div>
          <div>
            <span className="text-sm md:text-base font-bold text-white tracking-tight">ReliefRelay</span>
            <span className="text-[10px] text-gray-600 font-mono ml-2">v2.0</span>
          </div>
          <span className="hidden sm:block text-[10px] text-gray-600 font-mono border border-white/[0.06] rounded px-2 py-0.5">Command Center</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <span className="text-[10px] text-gray-500 font-mono hidden lg:block">Gemma 4 · RAG · Native Tooling · Local Inference</span>
          <div className="flex items-center gap-2" aria-live="polite">
            {mounted ? (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${statusTone === "amber" ? "bg-amber-300 animate-pulse" : "bg-emerald-400 pulse-ring-emerald"}`} />
                <span className={`text-xs font-medium font-mono ${statusTone === "amber" ? "text-amber-300" : "text-emerald-400 text-glow-emerald"}`}>{statusText}</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
                <span className="text-xs font-medium text-gray-500 font-mono">Checking…</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="px-5 md:px-8 pt-8 pb-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="glass-panel rounded-2xl p-6 md:p-10 relative overflow-hidden"
        >
          {/* Ambient grid */}
          <div className="hero-grid absolute inset-0 rounded-2xl" />
          {/* Scan line */}
          <div className="scan-line absolute inset-0 rounded-2xl pointer-events-none" />
          {/* Radial glow */}
          <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full bg-blue-600/[0.07] blur-3xl pointer-events-none" />
          <div className="absolute -top-16 right-0 w-60 h-60 rounded-full bg-cyan-400/[0.05] blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 mb-3 font-mono flex items-center gap-2"
            >
              <span className="w-4 h-px bg-cyan-400/50" />
              Humanitarian Intelligence Platform
              <span className="w-4 h-px bg-cyan-400/50" />
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="text-3xl md:text-5xl font-bold leading-[1.1] text-white max-w-4xl tracking-tight"
            >
              When infrastructure fails,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400">
                intelligence shouldn&apos;t.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="text-gray-400 mt-4 max-w-2xl text-sm md:text-base leading-relaxed"
            >
              Offline-first disaster coordination powered by Gemma 4. AI amplifies responders with explainable triage, evidence-linked decisions, and resilient local operations — no cloud required.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.36 }}
              className="mt-6 flex flex-wrap gap-2"
            >
              {HERO_PILLS.map((p) => (
                <span key={p.label} className={`text-[10px] font-mono px-3 py-1.5 rounded-full border ${p.color}`}>
                  {p.label}
                </span>
              ))}
            </motion.div>

            {/* Operational breadcrumb */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.44 }}
              className="mt-6 pt-5 border-t border-white/[0.05] grid grid-cols-3 gap-4"
            >
              {[
                { label: "Gemma 4", sub: "Native vision + tool calling", color: "cyan" },
                { label: "128K context", sub: "Full policy RAG inline", color: "purple" },
                { label: "100% offline", sub: "SQLite · ChromaDB · PDF", color: "emerald" },
              ].map(({ label, sub, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-sm font-semibold text-${color}-300`}>{label}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── IMPACT METRICS ── */}
      <section className="px-5 md:px-8 pb-5">
        <ImpactDashboard totalCases={cases.length} />
      </section>

      {/* ── PROCESSING BANNER ── */}
      <AnimatePresence>
        {loadingBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-blue-600/10 border-y border-cyan-500/20 px-6 py-3 flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-cyan-200 font-medium">{STEP_LABELS[loadingStep]}</p>
                <div className="mt-1.5 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"
                    initial={{ width: "5%" }}
                    animate={{ width: loadingStep === "extracting" ? "35%" : loadingStep === "retrieving" ? "65%" : "90%" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
              <span className="text-[10px] font-mono text-cyan-400/60 tracking-widest flex-shrink-0 hidden sm:block">
                GEMMA 4 · LOCAL
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN GRID ── */}
      <main className="flex-1 px-5 md:px-8 pb-8 space-y-4 mt-4">
        <div className="grid xl:grid-cols-[260px_minmax(0,1fr)_380px] gap-4">

          {/* Left sidebar — case list */}
          <aside className="glass-panel rounded-2xl overflow-hidden hidden xl:flex flex-col min-h-[620px]">
            <CaseList cases={cases} selectedCaseId={selectedCaseId} onSelect={setSelectedCaseId} />
          </aside>

          {/* Center column */}
          <div className="space-y-4">
            <IntakePanel onSubmit={handleSubmit} isLoading={loadingBanner} />
            <LiveReasoningTimeline loadingStep={loadingStep} isLoading={loadingBanner} events={result?.workflow_events ?? []} />
            <CrisisOperationsMap cases={cases} />
            <div className="grid lg:grid-cols-2 gap-4">
              <CaseActivityFeed latestCaseId={latestCaseId} />
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-panel rounded-2xl p-4 md:p-5 space-y-3"
              >
                <h3 className="text-sm font-semibold text-white">AI Explainability</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Every recommendation links to retrieval evidence, confidence cues, and an auditable action chain suitable for field decision support.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: "Evidence-linked", color: "text-cyan-400" },
                    { label: "Auditable chain", color: "text-purple-400" },
                    { label: "Offline-safe", color: "text-emerald-400" },
                  ].map(({ label, color }) => (
                    <div key={label} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-2 text-center">
                      <p className={`text-[10px] font-mono font-semibold ${color}`}>{label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right sidebar — results or operational readiness */}
          <aside className="space-y-4">
            {selectedCaseLoading && selectedCaseId && selectedCaseId !== result?.case_id && (
              <div className="glass-panel rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin flex-shrink-0" />
                  <span className="text-sm text-gray-400">Loading case history…</span>
                </div>
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-3 rounded shimmer bg-white/[0.03]" style={{ width: `${80 - i * 15}%` }} />
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {activeResponse ? (
                <motion.div
                  key="case-result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-4"
                >
                  <TriageCard result={activeResponse} />
                  <ActionPacket result={activeResponse} />
                  <EvidenceRail evidence={activeResponse.evidence} toolsUsed={activeResponse.tools_used} />
                </motion.div>
              ) : (
                <motion.div
                  key="readiness-panel"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                >
                  <OperationalReadinessPanel
                    health={health}
                    backendReachable={backendReachable}
                    isOnline={isOnline}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>

        {/* Mobile case list */}
        <div className="xl:hidden glass-panel rounded-2xl overflow-hidden">
          <CaseList cases={cases} selectedCaseId={selectedCaseId} onSelect={setSelectedCaseId} />
        </div>
      </main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#111827",
            color: "#e8eaf0",
            border: "1px solid rgba(255,255,255,0.07)",
            fontSize: "13px",
          },
          success: { iconTheme: { primary: "#34d399", secondary: "#111827" } },
          error:   { iconTheme: { primary: "#f87171", secondary: "#111827" } },
        }}
      />
    </div>
  );
}