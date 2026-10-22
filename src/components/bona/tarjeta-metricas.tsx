"use client";
import { motion } from "motion/react";
import { RD } from "@/lib/dinero";
import type { Metrica } from "@/lib/reglas/resumen";
import { Contador } from "./contador";
import { MiniGrafica } from "./minigrafica";

const fmt = (m: Metrica, n: number) => (m.formato === "dinero" ? RD(n) : new Intl.NumberFormat("es-DO").format(n));

/** Tarjeta grande con 3 métricas: mini gráfica, número grande y filas "Meta / Promedio". */
export function TarjetaMetricas({ titulo, periodo, metricas }: { titulo: string; periodo: string; metricas: Metrica[] }) {
  return (
    <section className="card lift flex h-full flex-col gap-4" aria-labelledby="tm-titulo">
      <header className="flex items-center justify-between">
        <h2 id="tm-titulo" className="text-lg font-semibold">{titulo}</h2>
        <span className="rounded-chip bg-raised px-3 py-1 text-xs text-muted">{periodo}</span>
      </header>
      <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-hairline">
        {metricas.map((m, i) => (
          <motion.article
            key={m.titulo}
            className="flex min-w-0 flex-col gap-2 sm:px-4 first:sm:pl-0 last:sm:pr-0"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i }}
          >
            <div className="flex min-h-[86px] flex-1 items-end">
              <MiniGrafica valores={m.serie.map((s) => s.valor)} tono={m.tono} formato={m.formato} alto={110} />
            </div>
            <h3 className="mt-1 text-sm font-semibold">{m.titulo}</h3>
            <Contador valor={m.valor} formato={m.formato} className="text-[clamp(1.6rem,2.6vw,2.4rem)] leading-none font-bold tracking-tight tabular-nums" />
            <dl className="mt-1 space-y-1 text-xs">
              {m.filas.map((f) => (
                <div key={f.etiqueta} className="flex justify-between gap-2">
                  <dt className="text-faint">{f.etiqueta}</dt>
                  <dd className="tabular-nums text-muted">{fmt(m, f.valor)}</dd>
                </div>
              ))}
            </dl>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
