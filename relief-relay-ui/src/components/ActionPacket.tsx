"use client";

import { FileDown, ClipboardList } from "lucide-react";
import { getPdfUrl } from "@/lib/api";
import type { IntakeResponse } from "@/lib/types";

interface ActionPacketProps {
  result: IntakeResponse;
}

export function ActionPacket({ result }: ActionPacketProps) {
  const { action_plan, case_id, resources } = result;

  const handleDownload = () => {
    if (!case_id) return;
    const url = getPdfUrl(case_id);
    window.open(url, "_blank");
  };

  const resourceList = Array.isArray(resources)
    ? (resources as Array<Record<string, unknown>>)
    : Object.values(resources ?? {}).flat() as Array<Record<string, unknown>>;

  return (
    <div className="bg-[#10141c] border border-white/[0.07] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Action Plan</h3>
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

      {/* Action plan text */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4">
        <div className="prose prose-sm prose-invert max-w-none">
          {action_plan
            ? action_plan.split("\n").map((line, i) => (
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
