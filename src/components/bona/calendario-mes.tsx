"use client";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { nombreMes, mayuscula, sumarDias } from "@/lib/fechas";
import { cn } from "@/lib/utils";

const SEMANA = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

/** 42 celdas (6 semanas) que empiezan el lunes anterior al día 1 del mes. */
function celdas(mes: string) {
  const primero = `${mes}-01`;
  const dow = (new Date(`${primero}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = lunes
  const inicio = sumarDias(primero, -dow);
  return Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
}
const mover = (mes: string, n: number) => {
  const [y, m] = mes.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return t.toISOString().slice(0, 7);
};

/** Panel azul destacado: calendario del mes en círculos. Hoy en lima, días con citas rellenos, otros meses punteados. */
export function CalendarioMes({ hoy, citasPorDia }: { hoy: string; citasPorDia: Record<string, number> }) {
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const [dir, setDir] = useState(0);
  const dias = celdas(mes);
  const ir = (n: number) => { setDir(n); setMes((m) => mover(m, n)); };
  const totalMes = Object.entries(citasPorDia).filter(([f]) => f.startsWith(mes)).reduce((a, [, n]) => a + n, 0);

  return (
    <section className="lift flex flex-col gap-4 rounded-card bg-royal p-5 text-on-royal" aria-labelledby="cal-titulo">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 id="cal-titulo" className="text-lg font-semibold">Citas del mes</h2>
          <p className="text-xs text-white/70">{totalMes} citas · {mayuscula(nombreMes(`${mes}-15`))}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => ir(-1)} aria-label="Mes anterior" className="grid size-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 active:scale-95">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => ir(1)} aria-label="Mes siguiente" className="grid size-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 active:scale-95">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[0.65rem] font-semibold tracking-wide text-white/75">
        {SEMANA.map((d) => <span key={d}>{d}</span>)}
      </div>

      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div
          key={mes}
          className="grid grid-cols-7 gap-1.5"
          custom={dir}
          initial={{ opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -40 }}
        >
          {dias.map((f, i) => {
            const otroMes = !f.startsWith(mes);
            const esHoy = f === hoy;
            const n = citasPorDia[f] ?? 0;
            return (
              <motion.div
                key={f}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.012, type: "spring", stiffness: 420, damping: 24 }}
              >
                <Link
                  href={`/agenda?fecha=${f}`}
                  aria-label={`${f}${n ? `, ${n} citas` : ""}${esHoy ? ", hoy" : ""}`}
                  className={cn(
                    "relative mx-auto grid aspect-square w-full max-w-11 place-items-center rounded-full text-sm font-semibold tabular-nums transition duration-200 hover:scale-110",
                    otroMes && "border border-dashed border-white/40 text-white/60",
                    !otroMes && !esHoy && n > 0 && "bg-night text-white",
                    !otroMes && !esHoy && n === 0 && "bg-royal-deep text-white/80",
                    esHoy && "bg-lime text-on-lime shadow-[0_0_0_4px_rgb(212_247_90/0.25)]",
                  )}
                >
                  {Number(f.slice(8))}
                  {n > 0 && !otroMes && (
                    <span className={cn("absolute bottom-[14%] size-1 rounded-full", esHoy ? "bg-on-lime" : "bg-lime")} />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
