"use client"

import { motion } from "framer-motion"
import {
  AlertTriangle, CheckCircle2, Info,
  MessageSquare, Stethoscope, ChevronRight
} from "lucide-react"
import { ActionStep as ActionStepType } from "@/lib/parseActionPlan"
import { cn } from "@/lib/utils"

const CATEGORY_CONFIG = {
  triage: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "Triage",
  },
  action: {
    icon: ChevronRight,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "Action",
  },
  assessment: {
    icon: Stethoscope,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    label: "Assessment",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "Urgent",
  },
  info: {
    icon: Info,
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    label: "Info",
  },
}

interface Props {
  step: ActionStepType
  index: number
}

export function ActionStep({ step, index }: Props) {
  const config = CATEGORY_CONFIG[step.category]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.07,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        "group flex gap-3 rounded-xl border p-4",
        "transition-all duration-200",
        "hover:brightness-110 hover:scale-[1.005] cursor-default",
        config.bg,
        config.border,
      )}
    >
      {/* Step number */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center",
          "text-[11px] font-mono font-semibold",
          "bg-black/20 border",
          config.border,
          config.color,
        )}>
          {index + 1}
        </div>
        {/* Connector line — hidden on last item via CSS in parent */}
        <div className="step-connector w-px flex-1 bg-white/5 min-h-[8px]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Category pill + icon */}
        <div className="flex items-center gap-2 mb-1.5">
          <Icon size={13} className={config.color} />
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-widest",
            config.color,
          )}>
            {config.label}
          </span>
        </div>

        {/* Title */}
        {step.title && (
          <p className="text-sm font-semibold text-white/90 mb-1 leading-snug">
            {step.title}
          </p>
        )}

        {/* Body */}
        {step.body && (
          <p className="text-sm text-white/60 leading-relaxed">
            {step.body}
          </p>
        )}
      </div>
    </motion.div>
  )
}
