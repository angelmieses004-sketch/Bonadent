"use client";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Anillo de progreso con el valor en el centro (como "Sleep Time" de la referencia). */
export function AnilloProgreso({ valor, total, centro, tamano = 92 }: { valor: number; total: number; centro: string; tamano?: number }) {
  const r = 38;
  const pct = total > 0 ? Math.min(1, valor / total) : 0;
  return (
    <div className="relative shrink-0" style={{ width: tamano, height: tamano }} role="img" aria-label={`${valor} de ${total}`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-raised)" strokeWidth="9" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none" stroke="var(--color-lime)" strokeWidth="9" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: pct }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums">{centro}</span>
    </div>
  );
}

/** Barra de progreso lima (como "Weight Loss Plan"). */
export function BarraProgreso({ pct, className }: { pct: number; className?: string }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-chip bg-raised", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className="h-full origin-left rounded-chip bg-lime"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: v / 100 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      />
    </div>
  );
}
