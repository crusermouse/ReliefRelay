import { useState } from "react";
import { motion } from "framer-motion";
import { Paperclip, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import type { EvidenceChunk } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EvidenceRailProps {
  evidence: EvidenceChunk[];
}

export function EvidenceRail({ evidence }: EvidenceRailProps) {
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    const newSet = new Set(expandedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedIndices(newSet);
  };

  return (
    <div className="bg-bg-secondary border border-border rounded-[16px] overflow-hidden">

      {/* HEADER */}
      <div className="flex items-center px-[16px] py-[12px] border-b border-border bg-bg-surface gap-[8px]">
        <Paperclip size={16} className="text-text-muted" />
        <h2 className="text-[13px] font-semibold text-text-muted uppercase tracking-[0.08em]">
          Policy Sources
        </h2>
        <span className="bg-bg-tertiary border border-border px-[6px] py-[2px] rounded-full text-[12px] font-mono text-text-secondary">
          {evidence.length}
        </span>
      </div>

      <div className="p-[16px] md:p-[24px] flex flex-col gap-[16px]">
        {evidence.length === 0 ? (
          <p className="text-[15px] text-text-muted italic text-center py-[16px]">
            No policy documents retrieved for this case.
          </p>
        ) : (
          <motion.div
            className="flex flex-col gap-[12px]"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { delayChildren: 0.5, staggerChildren: 0.1 }
              }
            }}
          >
            {evidence.map((chunk, idx) => {
              const isExpanded = expandedIndices.has(idx);
              return (
                <motion.div
                  key={idx}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="bg-bg-surface border border-border border-l-[3px] border-l-accent/40 rounded-[8px] p-[16px] flex flex-col gap-[8px]"
                >
                  <div className="flex items-start gap-[8px]">
                    <BookOpen size={14} className="text-text-secondary mt-[3px] shrink-0" />
                    <h4 className="text-[14px] font-semibold text-text-primary leading-[1.4] line-clamp-1 flex-1">
                      {chunk.source}
                    </h4>
                  </div>

                  <div className="pl-[22px]">
                    <p className={cn(
                      "text-[14px] text-text-secondary leading-[1.6] transition-all",
                      !isExpanded && "line-clamp-2"
                    )}>
                      &quot;{chunk.content}&quot;
                    </p>
                    <button
                      onClick={() => toggleExpand(idx)}
                      className="mt-[8px] text-[12px] font-medium text-accent hover:text-accent-light flex items-center gap-[4px]"
                    >
                      {isExpanded ? (
                        <>Show less <ChevronUp size={14} /></>
                      ) : (
                        <>Show more <ChevronDown size={14} /></>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
