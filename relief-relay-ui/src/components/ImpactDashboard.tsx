"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface ImpactDashboardProps {
  totalCases: number;
}

const METRIC_BASE = [
  { id: "assisted",    label: "People Assisted",          color: "text-cyan-200",    accent: "from-cyan-400/20 to-transparent",   border: "border-cyan-400/10",  value: 127 },
  { id: "risk",        label: "High-Risk Identified",     color: "text-amber-200",   accent: "from-amber-400/20 to-transparent",  border: "border-amber-400/10", value: 34  },
  { id: "sheltered",   label: "Families Sheltered",       color: "text-blue-200",    accent: "from-blue-400/20 to-transparent",   border: "border-blue-400/10",  value: 18  },
  { id: "escalations", label: "Emergency Escalations",    color: "text-rose-200",    accent: "from-rose-400/20 to-transparent",   border: "border-rose-400/10",  value: 9   },
] as const;

function Counter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (reduceMotion) { setDisplay(value); return; }
      const total = 700;
      const step = Math.max(1, Math.floor(value / 28));
      const interval = window.setInterval(() => {
        setDisplay((prev) => {
          if (prev >= value) { window.clearInterval(interval); return value; }
          return Math.min(value, prev + step);
        });
      }, Math.max(16, Math.floor(total / 28)));
      window.setTimeout(() => window.clearInterval(interval), total + 100);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [reduceMotion, value]);

  return <span>{display}</span>;
}

export function ImpactDashboard({ totalCases }: ImpactDashboardProps) {
  const metrics = useMemo(
    () =>
      METRIC_BASE.map((metric) =>
        metric.id === "assisted"
          ? { ...metric, value: metric.value + totalCases }
          : metric.id === "risk"
            ? { ...metric, value: metric.value + Math.floor(totalCases * 0.2) }
            : metric,
      ),
    [totalCases],
  );

  return (
    <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {metrics.map((metric, idx) => (
        <motion.div
          key={metric.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.07, type: "spring", stiffness: 180, damping: 20 }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
          className={`glass-panel rounded-xl p-4 relative overflow-hidden cursor-default group border ${metric.border}`}
        >
          {/* Gradient accent */}
          <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${metric.accent}`} />
          <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${metric.accent} blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

          <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 relative z-10">{metric.label}</p>
          <p className={`mt-2 text-3xl font-bold relative z-10 ${metric.color}`}>
            <Counter value={metric.value} />
          </p>

          {/* Live indicator */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1">
            <div className={`w-1 h-1 rounded-full ${metric.color.replace("text-", "bg-").replace("-200", "-400")} ambient-pulse`} />
          </div>
        </motion.div>
      ))}
    </section>
  );
}
