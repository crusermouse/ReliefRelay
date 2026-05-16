"use client";

import { useCallback, useEffect, useState } from "react";
import { HeartPulse, Menu, X, Inbox } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { IntakePanel } from "@/components/IntakePanel";
import { TriageCard } from "@/components/TriageCard";
import { EvidenceRail } from "@/components/EvidenceRail";
import { ActionPacket } from "@/components/ActionPacket";
import { CaseList } from "@/components/CaseList";
import { fetchCases, fetchCase, fetchHealth, submitIntake } from "@/lib/api";
import type { IntakeResponse, Case, HealthResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

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

export default function AppShell() {
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<IntakeResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inferenceStatus, setInferenceStatus] = useState<any>(null);

  // Mobile UI state
  const [activeTab, setActiveTab] = useState<"intake" | "cases" | "export">("intake");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const loadCases = useCallback(async () => {
    try {
      const data = await fetchCases();
      setCases(data.cases);
    } catch (err) {
      console.error("Failed to load cases", err);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/inference-status`)
      .then(r => r.json())
      .then(data => setInferenceStatus(data))
      .catch(() => {})
  }, []);

  const handleSelectCase = async (id: string) => {
    setActiveCaseId(id);
    setActiveTab("export"); // switch to result view on mobile
    try {
      const caseData = await fetchCase(id);
      setCurrentResponse(hydrateCaseResponse(caseData));
    } catch (err) {
      toast.error("Failed to load case");
      console.error(err);
    }
  };

  const handleNewIntake = () => {
    setActiveCaseId(null);
    setCurrentResponse(null);
    setActiveTab("intake");
  };

  const handleSubmitIntake = async (file?: File, text?: string) => {
    setIsProcessing(true);
    setCurrentResponse(null);
    setActiveCaseId(null);

    try {
      const response = await submitIntake(file, text);
      setCurrentResponse(response);
      setActiveCaseId(response.case_id);
      await loadCases();
      setActiveTab("export");
    } catch (err) {
      toast.error("Failed to process intake");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-primary text-text-primary">
      <Toaster position="top-right" toastOptions={{ className: "bg-bg-surface text-text-primary border border-border" }} />

      {/* HEADER */}
      <header className="sticky top-0 z-50 h-[52px] bg-bg-secondary border-b border-border flex items-center justify-between px-[16px] shrink-0">
        <div className="flex items-center gap-[8px]">
          {/* Mobile hamburger toggle */}
          <button
            className="md:hidden p-[4px] -ml-[4px] text-text-secondary hover:text-text-primary"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-[8px] text-text-primary">
            <HeartPulse size={18} className="text-triage-red" />
            <span className="font-semibold text-[15px] tracking-tight">ReliefRelay</span>
          </div>
        </div>

        <div className="flex items-center gap-[16px]">
          {activeCaseId && (
            <span className="hidden sm:inline-block font-mono text-[13px] text-text-muted bg-bg-surface px-[8px] py-[2px] rounded-[6px] border border-border">
              {activeCaseId}
            </span>
          )}
          <div className="flex items-center gap-[8px] bg-bg-surface border border-border px-[12px] py-[4px] rounded-[12px]">
            <div className={cn(
              "w-[8px] h-[8px] rounded-full",
              !inferenceStatus ? "bg-gray-400" : (inferenceStatus.provider === "google" ? "bg-blue-400" : "bg-triage-green")
            )} />
            <span className="text-[12px] font-medium text-text-secondary">
              {!inferenceStatus ? "Connecting…" : (inferenceStatus.provider === "google" ? "Gemma · Cloud" : "Gemma · Local")}
            </span>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR (Desktop) */}
        <aside className={cn(
          "w-[240px] bg-bg-secondary border-r border-border flex flex-col shrink-0",
          "md:flex", // Always flex on md+
          // Mobile state:
          isMobileMenuOpen ? "absolute inset-y-0 left-0 z-40" : "hidden"
        )}>
          <div className="flex-1 overflow-y-auto">
            <CaseList
              cases={cases}
              activeCaseId={activeCaseId}
              onSelectCase={(id) => {
                handleSelectCase(id);
                setIsMobileMenuOpen(false);
              }}
              onNewCase={() => {
                handleNewIntake();
                setIsMobileMenuOpen(false);
              }}
            />
          </div>
          <div className="p-[16px] border-t border-border shrink-0">
            <p className="text-[12px] font-medium text-text-muted text-center">Gemma 4 E4B · Local</p>
          </div>
        </aside>

        {/* Mobile backdrop for sidebar */}
        {isMobileMenuOpen && (
          <div
            className="absolute inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto bg-bg-primary">
          <div className="max-w-[800px] mx-auto p-[16px] md:p-[24px] lg:p-[32px] pb-[80px] md:pb-[32px] flex flex-col gap-[24px]">

            {/* Desktop always shows everything based on state.
                Mobile conditionally shows based on activeTab */}
            <div className={cn(
              "flex flex-col gap-[24px]",
              activeTab === "intake" ? "flex" : "hidden md:flex"
            )}>
              {!currentResponse && (
                <IntakePanel
                  onSubmit={handleSubmitIntake}
                  isProcessing={isProcessing}
                  onClear={handleNewIntake}
                />
              )}
            </div>

            <div className={cn(
              "flex flex-col gap-[24px]",
              activeTab === "export" ? "flex" : "hidden md:flex"
            )}>
              {currentResponse && (
                <>
                  <div className="flex justify-end md:hidden mb-[-16px]">
                    <button
                      onClick={handleNewIntake}
                      className="text-[13px] font-semibold text-accent hover:text-accent-light"
                    >
                      + New Intake
                    </button>
                  </div>
                  <TriageCard record={currentResponse.intake_record} />
                  <ActionPacket
                    actionPlan={currentResponse.action_plan}
                    caseId={currentResponse.case_id}
                    toolsUsed={currentResponse.tools_used}
                  />
                  <EvidenceRail evidence={currentResponse.evidence} />
                </>
              )}
              {!currentResponse && !isProcessing && activeTab === "export" && (
                <div className="flex flex-col items-center justify-center py-[64px] text-text-muted">
                  <Inbox size={48} className="mb-[16px] opacity-20" />
                  <p>No active case to view.</p>
                </div>
              )}
            </div>

            {/* Mobile "cases" tab content (just renders CaseList in main area for better mobile ux) */}
            <div className={cn(
              "md:hidden flex flex-col h-full",
              activeTab === "cases" ? "flex" : "hidden"
            )}>
               <CaseList
                  cases={cases}
                  activeCaseId={activeCaseId}
                  onSelectCase={(id) => {
                    handleSelectCase(id);
                  }}
                  onNewCase={handleNewIntake}
                />
            </div>

          </div>
        </main>
      </div>

      {/* MOBILE TAB BAR */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-[64px] bg-bg-surface border-t border-border flex items-center justify-around z-50 px-[16px]">
        <button
          onClick={() => setActiveTab("intake")}
          className={cn("flex flex-col items-center gap-[4px]", activeTab === "intake" ? "text-accent" : "text-text-muted")}
        >
          <span className="text-[12px] font-semibold uppercase tracking-wider">Intake</span>
        </button>
        <button
          onClick={() => setActiveTab("cases")}
          className={cn("flex flex-col items-center gap-[4px]", activeTab === "cases" ? "text-accent" : "text-text-muted")}
        >
          <span className="text-[12px] font-semibold uppercase tracking-wider">Cases</span>
        </button>
        <button
          onClick={() => setActiveTab("export")}
          className={cn("flex flex-col items-center gap-[4px]", activeTab === "export" ? "text-accent" : "text-text-muted")}
        >
          <span className="text-[12px] font-semibold uppercase tracking-wider">Result</span>
        </button>
      </nav>
    </div>
  );
}
