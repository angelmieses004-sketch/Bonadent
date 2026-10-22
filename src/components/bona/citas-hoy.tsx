"use client";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Plus } from "lucide-react";
import { hora12 } from "@/lib/fechas";
import type { CitaConNombres } from "@/lib/reglas/resumen";
import { cn } from "@/lib/utils";
import { GrupoAvatares } from "./avatar";
import { Chips } from "./chips";

type Filtro = "todas" | "confirmadas" | "pendientes";
const confirmada = (x: CitaConNombres) => x.cita.estado === "confirmada" || x.cita.estado === "completada";

const ESTADO: Record<string, string> = {
  programada: "Por confirmar",
  confirmada: "Confirmada",
  aplazada: "Aplazada",
  completada: "Completada",
};

/** "Mis actividades" de la referencia: citas de hoy en tarjetas, la próxima destacada en azul. */
export function CitasHoy({ citas, ahora }: { citas: CitaConNombres[]; ahora: string }) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const lista = citas.filter((x) => (filtro === "todas" ? true : filtro === "confirmadas" ? confirmada(x) : !confirmada(x)));
  const proxima = citas.find((x) => x.cita.hora >= ahora && x.cita.estado !== "completada")?.cita.id;

  return (
    <section className="card lift flex flex-col gap-4" aria-labelledby="ch-titulo">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ch-titulo" className="text-lg font-semibold">Citas de hoy</h2>
        <p className="text-sm text-muted">
          {citas.length === 0 ? "Sin citas hoy" : `Tienes ${citas.length} ${citas.length === 1 ? "cita" : "citas"} hoy`}
        </p>
      </header>

      <Chips
        etiqueta="Filtrar citas de hoy"
        valor={filtro}
        onCambio={setFiltro}
        opciones={[
          { valor: "todas", texto: "Todas", cuenta: citas.length },
          { valor: "confirmadas", texto: "Confirmadas", cuenta: citas.filter(confirmada).length },
          { valor: "pendientes", texto: "Por confirmar", cuenta: citas.filter((x) => !confirmada(x)).length },
        ]}
      />

      <motion.ul layout className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {lista.map(({ cita, paciente, doctor }, i) => {
            const destacada = cita.id === proxima;
            return (
              <motion.li
                key={cita.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 380, damping: 28 }}
              >
                <Link
                  href={`/agenda?fecha=${cita.fecha}`}
                  className={cn(
                    "group flex h-full min-h-36 flex-col justify-between gap-3 rounded-tile p-3.5 transition duration-200 hover:-translate-y-1",
                    destacada ? "bg-royal text-on-royal" : "bg-raised",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <GrupoAvatares personas={[{ nombre: paciente?.nombre ?? "Paciente" }, ...(doctor ? [{ nombre: doctor.nombre, color: doctor.color }] : [])]} />
                    <span className={cn("grid size-8 place-items-center rounded-full transition-transform duration-200 group-hover:rotate-45", destacada ? "bg-white/15" : "bg-card")}>
                      <ArrowUpRight className="size-4" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className={cn("truncate text-xs", destacada ? "text-white/75" : "text-muted")}>
                      {paciente?.nombre} · {ESTADO[cita.estado] ?? cita.estado}
                    </p>
                    <p className="truncate font-semibold">{cita.tratamiento}</p>
                    <p className="text-xl font-bold tabular-nums">{hora12(cita.hora)}</p>
                  </div>
                </Link>
              </motion.li>
            );
          })}
          <motion.li key="agregar" layout>
            <Link
              href="/agenda?nueva=1"
              className="group grid h-full min-h-36 place-items-center rounded-tile border-2 border-dashed border-lime/50 p-3 text-center text-sm text-muted transition duration-200 hover:border-lime hover:text-ink"
            >
              <span className="flex flex-col items-center gap-1.5">
                <Plus className="size-6 transition-transform duration-300 group-hover:rotate-90" />
                Agregar cita
              </span>
            </Link>
          </motion.li>
        </AnimatePresence>
      </motion.ul>
    </section>
  );
}
