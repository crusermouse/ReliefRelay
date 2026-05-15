import { useState } from "react";
import { motion } from "framer-motion";
import { Cpu, FileDown, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPdfUrl } from "@/lib/api";
import { toast } from "react-hot-toast";

interface ActionPacketProps {
  actionPlan: string;
  caseId: string;
  toolsUsed: string[];
}

const TOOL_DESCRIPTIONS: Record<string, string> = {
  search_local_resources: "Searches local offline databases for beds, supplies, and staff.",
  create_case: "Registers a new case ID in the local triage system.",
  score_triage: "Calculates medical urgency based on standard protocols.",
  generate_referral_pdf: "Compiles intake and action plan into a printable referral document."
};

export function ActionPacket({ actionPlan, caseId, toolsUsed }: ActionPacketProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Parse action plan by newlines, filtering out empty lines
  const planSteps = actionPlan
    .split('\n')
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim()) // remove leading numbers if they exist
    .filter(line => line.length > 0);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Simulate slight delay for feedback
      await new Promise(r => setTimeout(r, 600));
      window.open(getPdfUrl(caseId), "_blank");
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (e) {
      toast.error("Failed to open PDF export");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(actionPlan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Action plan copied");
  };

  return (
    <div className="bg-bg-secondary border border-border rounded-[16px] overflow-hidden">

      {/* HEADER */}
      <div className="flex items-center justify-between px-[16px] py-[12px] border-b border-border bg-bg-surface">
        <h2 className="text-[13px] font-semibold text-text-muted uppercase tracking-[0.08em]">Action Plan</h2>
        <div className="flex items-center gap-[8px]">
          <button
            onClick={handleCopy}
            className="flex items-center gap-[6px] text-[12px] font-medium text-text-secondary hover:text-text-primary px-[8px] py-[4px] rounded-[6px] hover:bg-bg-tertiary transition-colors"
          >
            {copied ? <Check size={14} className="text-triage-green" /> : <Copy size={14} />}
            <span>Copy</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-[6px] text-[12px] font-medium text-text-secondary hover:text-text-primary px-[8px] py-[4px] rounded-[6px] hover:bg-bg-tertiary transition-colors"
          >
            <FileDown size={14} />
            <span className="hidden sm:inline-block">Export PDF ↓</span>
          </button>
        </div>
      </div>

      <div className="p-[16px] md:p-[24px] flex flex-col gap-[24px]">

        {/* ACTION PLAN LIST */}
        <motion.div
          className="flex flex-col gap-[16px]"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08 }
            }
          }}
        >
          {planSteps.map((step, idx) => (
            <motion.div
              key={idx}
              variants={{
                hidden: { opacity: 0, x: -10 },
                visible: { opacity: 1, x: 0 }
              }}
              className="flex items-start gap-[12px]"
            >
              <div className="w-[24px] h-[24px] shrink-0 rounded-full bg-bg-surface border border-border flex items-center justify-center font-mono text-[12px] text-text-secondary mt-[2px]">
                {idx + 1}
              </div>
              <p className="text-[15px] text-text-primary leading-[1.6] pt-[2px]">
                {step}
              </p>
            </motion.div>
          ))}
          {planSteps.length === 0 && (
            <p className="text-[15px] text-text-muted italic">No specific actions generated.</p>
          )}
        </motion.div>

        {/* TOOLS USED */}
        <div className="border-t border-border pt-[20px] flex flex-col gap-[12px]">
          <div className="flex items-center gap-[8px] text-[13px] font-semibold text-text-muted uppercase tracking-[0.08em]">
            <Cpu size={14} />
            <span>Tools used by Gemma 4</span>
          </div>
          <div className="flex flex-wrap gap-[8px]">
            {toolsUsed && toolsUsed.length > 0 ? (
              toolsUsed.map((tool) => (
                <div
                  key={tool}
                  className="group relative bg-bg-surface border border-border border-l-[3px] border-l-accent px-[10px] py-[4px] rounded-[6px] font-mono text-[12px] text-text-secondary hover:text-text-primary transition-colors cursor-help"
                >
                  {tool}
                  {/* Tooltip */}
                  <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-[220px] p-[10px] bg-bg-tertiary border border-border rounded-[8px] text-[12px] font-sans text-text-primary opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg pointer-events-none">
                    {TOOL_DESCRIPTIONS[tool] || "Internal agent function."}
                  </div>
                </div>
              ))
            ) : (
              <span className="text-[13px] text-text-muted">No external tools invoked.</span>
            )}
          </div>
        </div>

        {/* EXPORT SECTION */}
        <div className="border-t border-border pt-[20px] flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
          <div className="flex items-center gap-[12px]">
            <span className="text-[12px] font-semibold text-text-muted uppercase tracking-[0.08em]">Case ID</span>
            <span className="font-mono text-[20px] text-text-primary">{caseId}</span>
            <span className="bg-triage-green-bg text-triage-green border border-triage-green-border px-[8px] py-[2px] rounded-[6px] text-[12px] font-medium flex items-center gap-[4px]">
              SAVED <Check size={12} />
            </span>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              "h-[48px] px-[24px] rounded-[12px] font-medium text-[14px] flex items-center justify-center gap-[8px] transition-all duration-300",
              isExporting
                ? "bg-bg-tertiary text-text-secondary border border-border cursor-wait"
                : exportSuccess
                  ? "bg-bg-surface border border-triage-green text-text-primary"
                  : "bg-bg-surface border border-border hover:border-border-hover text-text-primary hover:bg-bg-tertiary"
            )}
          >
            {isExporting ? (
              <div className="w-5 h-5 border-2 border-text-muted border-t-text-primary rounded-full animate-spin" />
            ) : exportSuccess ? (
              <>
                Exported Successfully <Check size={16} className="text-triage-green" />
              </>
            ) : (
              <>
                <FileDown size={18} /> Export Referral PDF →
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
