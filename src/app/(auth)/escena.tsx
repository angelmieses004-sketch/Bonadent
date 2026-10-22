"use client";
import { motion } from "motion/react";
import { BellRing, Check } from "lucide-react";

/** Panel decorativo del login: calendario de círculos que se enciende en ola y tarjetas flotantes. */
export function EscenaLogin() {
  const marcados = new Set([2, 5, 6, 9, 12, 13, 16, 19, 20, 23, 26, 27]);
  return (
    <div className="relative hidden overflow-hidden rounded-panel bg-royal p-10 text-on-royal lg:flex lg:flex-col lg:justify-between">
      <div>
        <p className="text-sm text-white/70">Bonadent</p>
        <h2 className="mt-2 max-w-sm text-4xl leading-tight font-bold tracking-tight">La clínica, en orden y a tiempo.</h2>
        <p className="mt-3 max-w-sm text-white/75">Agenda por odontólogo, recordatorios por WhatsApp, caja y cotizaciones en un solo lugar.</p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-7 gap-2 self-center" aria-hidden>
        {Array.from({ length: 28 }, (_, i) => (
          <motion.span
            key={i}
            className={`grid aspect-square place-items-center rounded-full text-xs font-semibold ${i === 15 ? "bg-lime text-on-lime" : marcados.has(i) ? "bg-night" : "border border-dashed border-white/35"}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.25 + (i % 7) * 0.05 + Math.floor(i / 7) * 0.08, type: "spring", stiffness: 380, damping: 20 }}
          >
            {i + 1}
          </motion.span>
        ))}
      </div>

      <div className="relative h-28" aria-hidden>
        <motion.div
          className="absolute left-0 top-0 flex items-center gap-3 rounded-card bg-shell px-4 py-3 text-ink shadow-lift"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: [0, -6, 0], opacity: 1 }}
          transition={{ y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }, opacity: { delay: 1 } }}
        >
          <span className="grid size-9 place-items-center rounded-full bg-lime text-on-lime"><Check className="size-4" /></span>
          <span><b className="block text-sm">Ana confirmó su cita</b><span className="text-xs text-muted">Control de brackets · 9:00 a. m.</span></span>
        </motion.div>
        <motion.div
          className="absolute right-0 bottom-0 flex items-center gap-3 rounded-card bg-card px-4 py-3 text-ink shadow-lift"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: [0, 6, 0], opacity: 1 }}
          transition={{ y: { duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 1.6 }, opacity: { delay: 1.4 } }}
        >
          <span className="grid size-9 place-items-center rounded-full bg-royal text-on-royal"><BellRing className="size-4" /></span>
          <span><b className="block text-sm">12 recordatorios enviados</b><span className="text-xs text-muted">Hoy, 7:45 a. m.</span></span>
        </motion.div>
      </div>
    </div>
  );
}
