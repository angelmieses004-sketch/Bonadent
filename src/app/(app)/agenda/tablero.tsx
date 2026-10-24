"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { fechaLarga, mayuscula, nombreMes, sumarDias } from "@/lib/fechas";
import { esActiva } from "@/lib/reglas/recordatorios";
import { cn } from "@/lib/utils";
import type { Cita, Doctor, Paciente, Rol, Servicio } from "@/tipos";
import { Avatar } from "@/components/bona/avatar";
import { Chips } from "@/components/bona/chips";
import { TarjetaCita } from "@/components/bona/tarjeta-cita";
import { FormularioAplazar, FormularioCita, type ValoresCita } from "@/components/bona/formulario-cita";
import { Pestanas } from "@/components/ui/pestanas";

export type Vista = "dia" | "semana" | "mes";
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const lunesDe = (f: string) => sumarDias(f, -((new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7));
const moverMes = (f: string, n: number) => {
  const [y, m] = f.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1, 12)).toISOString().slice(0, 10);
};

export function TableroAgenda({ vista, fecha, hoy, citas, pacientes, doctores, servicios, rol, miDoctor, nueva }: {
  vista: Vista; fecha: string; hoy: string; citas: Cita[]; pacientes: Paciente[]; doctores: Doctor[]; servicios: Servicio[];
  rol: Rol; miDoctor: string | null; nueva: ValoresCita | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ValoresCita | null>(nueva);
  const [aplazando, setAplazando] = useState<Cita | null>(null);
  const [soloMia, setSoloMia] = useState<"mia" | "todas">(rol === "odontologo" && miDoctor ? "mia" : "todas");
  const ctx = useMemo(() => ({ pacientes, doctores, servicios, citas }), [pacientes, doctores, servicios, citas]);
  const pac = useMemo(() => new Map(pacientes.map((p) => [p.id, p])), [pacientes]);
  const doc = useMemo(() => new Map(doctores.map((d) => [d.id, d])), [doctores]);
  const visibles = soloMia === "mia" ? citas.filter((c) => c.doctor_id === miDoctor) : citas;
  const del = (f: string) => visibles.filter((c) => c.fecha === f).sort((a, b) => a.hora.localeCompare(b.hora));

  const cerrarForm = useCallback((v: boolean) => {
    if (!v) { setForm(null); router.replace(`/agenda?vista=${vista}&fecha=${fecha}`, { scroll: false }); }
  }, [router, vista, fecha]);
  const editar = useCallback((c: Cita) => setForm({ ...c, doctor_id: c.doctor_id ?? undefined, tratamiento: c.tratamiento ?? undefined }), []);
  const nuevaEn = (extra: ValoresCita) => setForm({ fecha, hora: "09:00", duracion_min: 30, cada_dias: 0, ...extra });

  const paso = vista === "dia" ? 1 : 7;
  const anterior = vista === "mes" ? moverMes(fecha, -1) : sumarDias(fecha, -paso);
  const siguiente = vista === "mes" ? moverMes(fecha, 1) : sumarDias(fecha, paso);
  const url = (v: Vista, f: string) => `/agenda?vista=${v}&fecha=${f}`;
  const lunes = lunesDe(fecha);
  const titulo = vista === "dia" ? mayuscula(fechaLarga(fecha)) : vista === "semana" ? `Semana del ${Number(lunes.slice(8))} al ${Number(sumarDias(lunes, 6).slice(8))} de ${nombreMes(sumarDias(lunes, 6)).split(" ")[0]}` : mayuscula(nombreMes(fecha));
  const columnas = doctores.filter((d) => d.activo && (soloMia === "todas" || d.id === miDoctor));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <Link href={url(vista, anterior)} aria-label="Anterior" className="grid size-11 place-items-center rounded-full bg-card transition hover:bg-raised active:scale-95"><ChevronLeft className="size-4" /></Link>
          <Link href={url(vista, siguiente)} aria-label="Siguiente" className="grid size-11 place-items-center rounded-full bg-card transition hover:bg-raised active:scale-95"><ChevronRight className="size-4" /></Link>
          <Link href={url(vista, hoy)} className={cn("flex h-11 items-center rounded-chip px-4 text-sm font-semibold transition", fecha === hoy ? "bg-lime text-on-lime" : "bg-card hover:bg-raised")}>Hoy</Link>
          <label className="sr-only" htmlFor="ir-fecha">Ir a fecha</label>
          <input id="ir-fecha" type="date" value={fecha} onChange={(e) => e.target.value && router.push(url(vista, e.target.value))} className="h-11 min-w-0 flex-1 rounded-chip bg-card px-4 text-sm md:flex-none" />
          <h2 className="w-full text-lg font-bold tracking-tight md:ml-1 md:w-auto md:text-xl">{titulo}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rol === "odontologo" && miDoctor && (
            <Chips etiqueta="Agenda" valor={soloMia} onCambio={setSoloMia} opciones={[{ valor: "mia", texto: "Mi agenda" }, { valor: "todas", texto: "Todos" }]} />
          )}
          <Pestanas grupo="vista-agenda" activo={vista} items={[
            { valor: "dia", texto: "Día", href: url("dia", fecha) },
            { valor: "semana", texto: "Semana", href: url("semana", fecha) },
            { valor: "mes", texto: "Mes", href: url("mes", fecha) },
          ]} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${vista}-${fecha}-${soloMia}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
          {vista === "dia" && (
            <div className="grid gap-3 md:auto-cols-[minmax(270px,1fr)] md:grid-flow-col md:gap-4 md:overflow-x-auto md:pb-2">
              {columnas.map((d) => {
                const lista = del(fecha).filter((c) => c.doctor_id === d.id);
                return (
                  <section key={d.id} className="card flex flex-col gap-3 md:min-h-80" aria-label={`Agenda de ${d.nombre}`}>
                    <header className="flex items-center gap-3">
                      <Avatar nombre={d.nombre} color={d.color} className="size-11" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{d.nombre}</p>
                        <p className="truncate text-xs text-muted">{d.especialidad} · {lista.filter((c) => c.estado !== "cancelada").length} citas</p>
                      </div>
                    </header>
                    <AnimatePresence initial={false}>
                      {lista.map((c) => (
                        <TarjetaCita key={c.id} cita={c} paciente={pac.get(c.paciente_id)} doctor={d} rol={rol} onEditar={editar} onAplazar={setAplazando} />
                      ))}
                    </AnimatePresence>
                    <button onClick={() => nuevaEn({ doctor_id: d.id })} className="group mt-auto grid min-h-14 place-items-center md:min-h-20 rounded-tile border-2 border-dashed border-lime/40 text-sm text-muted transition hover:border-lime hover:text-ink">
                      <span className="flex items-center gap-2"><Plus className="size-4 transition-transform duration-300 group-hover:rotate-90" /> {lista.length ? "Agregar" : "Libre · agregar cita"}</span>
                    </button>
                  </section>
                );
              })}
            </div>
          )}

          {vista === "semana" && (
            <div className="grid gap-2.5 md:auto-cols-[minmax(200px,1fr)] md:grid-flow-col md:gap-3 md:overflow-x-auto md:pb-2">
              {Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).map((f, i) => {
                const lista = del(f);
                return (
                  <section key={f} className={cn("flex flex-col gap-2 rounded-card p-3 md:min-h-72", f === hoy ? "bg-royal text-on-royal" : "bg-card")}>
                    <Link href={url("dia", f)} className="flex items-center justify-between rounded-tile px-1 py-1 hover:opacity-80">
                      <span className="text-sm font-semibold">{DIAS[i]}</span>
                      <span className={cn("grid size-9 place-items-center rounded-full text-sm font-bold", f === hoy ? "bg-lime text-on-lime" : "bg-raised")}>{Number(f.slice(8))}</span>
                    </Link>
                    {lista.map((c) => (
                      <TarjetaCita key={c.id} cita={c} paciente={pac.get(c.paciente_id)} doctor={c.doctor_id ? doc.get(c.doctor_id) : undefined} rol={rol} onEditar={editar} onAplazar={setAplazando} compacta />
                    ))}
                    {!lista.length && <p className={cn("text-xs md:mt-2 md:text-center", f === hoy ? "text-white/70" : "text-faint")}>Sin citas</p>}
                    <button onClick={() => { setForm({ fecha: f, hora: "09:00", duracion_min: 30, cada_dias: 0 }); }} aria-label={`Agregar cita el ${f}`} className={cn("mt-auto grid h-10 place-items-center rounded-tile border-2 border-dashed transition", f === hoy ? "border-white/40 hover:border-white" : "border-lime/40 text-muted hover:border-lime")}>
                      <Plus className="size-4" />
                    </button>
                  </section>
                );
              })}
            </div>
          )}

          {vista === "mes" && <Mes fecha={fecha} hoy={hoy} citas={visibles} pac={pac} url={url} />}
        </motion.div>
      </AnimatePresence>

      <FormularioCita abierto={Boolean(form)} onCambio={cerrarForm} valores={form ?? {}} ctx={ctx} />
      <FormularioAplazar cita={aplazando} onCerrar={() => setAplazando(null)} ctx={ctx} />
    </>
  );
}

function Mes({ fecha, hoy, citas, pac, url }: { fecha: string; hoy: string; citas: Cita[]; pac: Map<string, Paciente>; url: (v: Vista, f: string) => string }) {
  const mes = fecha.slice(0, 7);
  const inicio = lunesDe(`${mes}-01`);
  const dias = Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
  return (
    <section className="rounded-panel bg-royal p-3 text-on-royal sm:p-5" aria-label="Calendario del mes">
      <div className="grid grid-cols-7 gap-1.5 pb-2 text-center text-xs font-semibold text-white/75 sm:gap-2">
        {DIAS.map((d) => <span key={d}>{d.toUpperCase()}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {dias.map((f, i) => {
          const lista = citas.filter((c) => c.fecha === f && (esActiva(c) || c.estado === "completada")).sort((a, b) => a.hora.localeCompare(b.hora));
          const otro = !f.startsWith(mes);
          return (
            <motion.div key={f} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.008, type: "spring", stiffness: 400, damping: 28 }}>
              <Link
                href={url("dia", f)}
                className={cn(
                  "flex aspect-square flex-col gap-1 rounded-2xl p-1.5 text-left transition duration-200 hover:-translate-y-0.5 sm:aspect-auto sm:min-h-28 sm:p-2.5",
                  otro ? "border border-dashed border-white/35 text-white/55" : f === hoy ? "bg-lime text-on-lime" : lista.length ? "bg-night" : "bg-royal-deep",
                )}
              >
                <span className="text-sm font-bold tabular-nums">{Number(f.slice(8))}</span>
                <span className="hidden flex-col gap-1 sm:flex">
                  {lista.slice(0, 2).map((c) => (
                    <span key={c.id} className={cn("truncate rounded-md px-1.5 py-0.5 text-[0.68rem]", f === hoy ? "bg-black/10" : "bg-white/10")}>
                      {c.hora} {pac.get(c.paciente_id)?.nombre.split(" ")[0]}
                    </span>
                  ))}
                  {lista.length > 2 && <span className="text-[0.68rem] opacity-75">+{lista.length - 2} más</span>}
                </span>
                {lista.length > 0 && <span className={cn("mt-auto size-1.5 self-center rounded-full sm:hidden", f === hoy ? "bg-on-lime" : "bg-lime")} />}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
