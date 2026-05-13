"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import type { EvidenceChunk } from "@/lib/types";

interface EvidenceRailProps {
  evidence: EvidenceChunk[];
  toolsUsed: string[];
}

export function EvidenceRail({ evidence, toolsUsed }: EvidenceRailProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="bg-[#10141c] border border-white/[0.07] rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Policy Evidence</h3>
        <span className="text-xs text-gray-500">({evidence.length} sources)</span>
      </div>

      {/* Tool calls audit */}
      {toolsUsed.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Tools called by Gemma 4</p>
          <div className="flex flex-wrap gap-1.5">
            {toolsUsed.map((tool, i) => (
              <span
                key={i}
                className="bg-purple-500/10 text-purple-300 text-xs font-mono px-2 py-1 rounded border border-purple-500/20"
              >
                {tool}()
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Evidence chunks */}
      {evidence.length === 0 ? (
        <p className="text-xs text-gray-600 italic">No policy documents indexed yet. Add documents to backend/data/relief_docs/</p>
      ) : (
        <div className="space-y-2">
          {evidence.map((chunk, i) => (
            <div
              key={i}
              className="bg-white/[0.02] border border-white/[0.05] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="bg-blue-500/10 text-blue-300 text-xs px-2 py-1 rounded-md truncate max-w-[80%]">
                  {chunk.source.split("/").pop() ?? chunk.source}
                </span>
                {expanded === i ? (
                  <ChevronUp className="w-3 h-3 text-gray-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
                )}
              </button>
              {expanded === i && (
                <div className="px-3 pb-3">
                  <p className="text-xs text-gray-400 leading-relaxed">{chunk.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
