"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { CalendarPlus, History, MapPin, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fechaCorta } from "@/lib/fechas";
import { ESTADOS, ORDEN_ESTADOS, conSituacion, esPendiente, textoTratamiento } from "@/lib/reglas/odontograma";
import type { EstadoPieza, EventoPieza, Marcador, PiezaDental, Situacion } from "@/tipos";
import { Dialogo } from "@/components/ui/dialogo";
import { AreaTexto, Boton } from "@/components/ui/formulario";
import { ejecutar } from "@/components/ui/avisos";
import { eliminarMarcador, guardarEstadoPieza } from "./acciones";
import { IconoEstado } from "./odontograma";

export function PanelPieza({ numero, abierto, onCerrar, pieza, eventos, marcadores, pacienteId, puedeEditar, onVerMarcador }: {
  numero: number | null;
  abierto: boolean;
  onCerrar: () => void;
  pieza?: PiezaDental;
  eventos: EventoPieza[];
  marcadores: Marcador[];
  pacienteId: string;
  puedeEditar: boolean;
  onVerMarcador: (m: Marcador) => void;
}) {
  const [estado, setEstado] = useState<EstadoPieza>("sana");
  const [situacion, setSituacion] = useState<Situacion | null>(null);
  const [nota, setNota] = useState("");
  const [guardando, iniciar] = useTransition();

  const [clave, setClave] = useState<string | null>(null);
  const actual = abierto ? `${numero}:${pieza?.actualizado_en ?? ""}` : null;
  if (actual !== clave) {
    setClave(actual);
    if (abierto) { setEstado(pieza?.estado ?? "sana"); setSituacion(pieza?.situacion ?? null); setNota(pieza?.nota ?? ""); }
  }

  if (numero === null) return null;
  const elegir = (e: EstadoPieza) => {
    setEstado(e);
    setSituacion(conSituacion(e) ? situacion ?? "indicado" : null);
  };
  const cambio = estado !== (pieza?.estado ?? "sana") || situacion !== (pieza?.situacion ?? null) || nota !== (pieza?.nota ?? "");
  const guardar = () => iniciar(() => ejecutar(() => guardarEstadoPieza({ paciente_id: pacienteId, pieza_fdi: numero, estado, situacion, nota: nota || null })));
  const pendiente = esPendiente({ estado, situacion });

  return (
    <Dialogo abierto={abierto} onCambio={(v) => !v && onCerrar()} titulo={`Pieza ${numero}`} descripcion={`${ESTADOS[estado].nombre}${situacion ? ` · ${situacion}` : ""}${pendiente ? " · pendiente de tratar" : ""}`} ancho="max-w-2xl">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Estado de la pieza">
          {ORDEN_ESTADOS.map((e) => {
            const on = e === estado;
            return (
              <motion.button
                key={e}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!puedeEditar}
                onClick={() => elegir(e)}
                whileTap={{ scale: 0.95 }}
                className={cn("relative flex min-h-16 flex-col items-start justify-between gap-1 rounded-tile p-3 text-left text-sm font-semibold transition disabled:cursor-default", on ? "bg-card ring-2 ring-lime" : "bg-raised hover:bg-card")}
              >
                <span className="grid size-8 place-items-center rounded-full" style={{ background: `color-mix(in oklab, ${ESTADOS[e].color} 22%, transparent)` }}>
                  <IconoEstado estado={e} className="size-4" />
                </span>
                {ESTADOS[e].nombre}
              </motion.button>
            );
          })}
        </div>

        {conSituacion(estado) && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">Situación</span>
            <div className="inline-flex rounded-chip bg-sunken p-1">
              {(["indicado", "realizado"] as const).map((s) => (
                <button key={s} type="button" disabled={!puedeEditar} onClick={() => setSituacion(s)} aria-pressed={situacion === s}
                  className={cn("min-h-9 rounded-chip px-4 text-sm font-medium capitalize transition", situacion === s ? "bg-lime text-on-lime" : "text-muted hover:text-ink")}>
                  {s === "indicado" ? "Indicado (pendiente)" : "Realizado"}
                </button>
              ))}
            </div>
          </div>
        )}

        {puedeEditar && (
          <>
            <AreaTexto etiqueta="Nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: caries oclusal profunda" />
            <div className="flex flex-wrap gap-2">
              <Boton onClick={guardar} cargando={guardando} disabled={!cambio} className="h-12 flex-1">Guardar estado</Boton>
              {estado !== "sana" && estado !== "ausente" && (
                <Link href={`/agenda?nueva=1&paciente=${pacienteId}&pieza=${numero}&tratamiento=${encodeURIComponent(textoTratamiento(estado, numero, situacion))}`}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-chip bg-royal px-5 text-sm font-semibold text-on-royal transition hover:-translate-y-0.5 hover:bg-royal-deep">
                  <CalendarPlus className="size-4" /> Agendar tratamiento
                </Link>
              )}
            </div>
          </>
        )}

        {marcadores.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><MapPin className="size-4 text-lime" /> En la panorámica</h3>
            {marcadores.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-tile bg-raised p-2.5 text-sm">
                <button onClick={() => onVerMarcador(m)} className="min-w-0 flex-1 truncate text-left hover:underline">{m.nota || "Marcador sin nota"}</button>
                {puedeEditar && (
                  <button onClick={() => ejecutar(() => eliminarMarcador(m.id, pacienteId))} aria-label="Eliminar marcador" className="grid size-9 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><History className="size-4 text-lime" /> Historial</h3>
          {eventos.length ? (
            <ol className="relative flex flex-col gap-3 border-l-2 border-hairline pl-4">
              {eventos.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute top-1 -left-[1.4rem] grid size-4 place-items-center rounded-full bg-shell"><IconoEstado estado={e.estado} className="size-3" /></span>
                  <p className="font-semibold">{ESTADOS[e.estado].nombre}{e.situacion ? ` · ${e.situacion}` : ""}</p>
                  <p className="text-xs text-muted">{fechaCorta(e.creado_en.slice(0, 10))} {e.creado_en.slice(0, 4)} · {e.quien}</p>
                  {e.nota && <p className="text-xs text-muted">{e.nota}</p>}
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted">Sin cambios registrados.</p>}
        </section>
      </div>
    </Dialogo>
  );
}
