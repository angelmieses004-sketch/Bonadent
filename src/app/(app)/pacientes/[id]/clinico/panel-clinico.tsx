"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, EyeOff, FileText, ImageOff, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fechaCorta } from "@/lib/fechas";
import { resumenOdontograma, type Denticion } from "@/lib/reglas/odontograma";
import { AVISO_SUGERENCIA } from "@/lib/ia/asistente";
import type { Doctor, Marcador, Rol, Servicio } from "@/tipos";
import type { Clinico } from "@/datos/repo";
import { Chips } from "@/components/bona/chips";
import { Contador } from "@/components/bona/contador";
import { avisar, ejecutar } from "@/components/ui/avisos";
import { cotizarOdontograma, decidirSugerencia, eliminarPanoramica, pedirSugerencias } from "./acciones";
import { VisorPanoramica } from "./visor";
import { Comparador } from "./comparador";
import { Leyenda, Odontograma } from "./odontograma";
import { PanelPieza } from "./panel-pieza";
import { SubirPanoramica } from "./subir";

export function PanelClinico({ paciente, clinico, rol, doctores, iaActiva }: {
  paciente: { id: string; nombre: string };
  clinico: Clinico;
  rol: Rol;
  doctores: Doctor[];
  servicios: Servicio[];
  iaActiva: boolean;
  hoyLargo: string;
}) {
  const router = useRouter();
  const verImagenes = rol !== "recepcion";
  const puedeEditar = rol !== "recepcion";
  const { panoramicas, marcadores, piezas, eventos, sugerencias } = clinico;
  const [actualId, setActualId] = useState(panoramicas[0]?.id ?? null);
  const actual = panoramicas.find((p) => p.id === actualId) ?? panoramicas[0];
  const [modo, setModo] = useState<"ver" | "comparar">("ver");
  const [pieza, setPieza] = useState<number | null>(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [denticion, setDenticion] = useState<Denticion>("adulto");
  const [cotizando, iniciarCot] = useTransition();
  const [pidiendo, iniciarIA] = useTransition();

  const marcadoresActual = useMemo(() => marcadores.filter((m) => m.panoramica_id === actual?.id), [marcadores, actual]);
  const sugActual = sugerencias.filter((s) => s.panoramica_id === actual?.id);
  const piezasConMarcador = useMemo(() => new Set(marcadores.map((m) => m.pieza_fdi)), [marcadores]);
  const res = resumenOdontograma(piezas, denticion);

  const elegir = (n: number) => { setPieza(n); setPanelAbierto(true); };
  const verMarcador = (m: Marcador) => { setActualId(m.panoramica_id); setModo("ver"); setPanelAbierto(false); document.getElementById("visor")?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const cotizar = () => iniciarCot(async () => {
    const r = await cotizarOdontograma(paciente.id);
    if (r.error) avisar(r.error, "error");
    else if (r.id) { avisar(r.ok ?? "Cotización creada"); router.push(`/cotizaciones/${r.id}`); }
  });

  const [antes, despues] = panoramicas.length >= 2 ? [panoramicas[panoramicas.length - 1], panoramicas[0]] : [undefined, undefined];

  return (
    <div className="flex flex-col gap-5">
      {/* --------- Panorámica --------- */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <motion.section id="visor" className="card flex min-w-0 flex-col gap-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Panorámica</h3>
              <p className="text-sm text-muted">{actual ? `${actual.nota ?? "Sin nota"} · ${doctores.find((d) => d.id === actual.doctor_id)?.nombre ?? ""}` : "Sin radiografías"}</p>
            </div>
            {verImagenes && panoramicas.length >= 2 && (
              <Chips etiqueta="Modo del visor" valor={modo} onCambio={setModo} opciones={[{ valor: "ver", texto: "Ver" }, { valor: "comparar", texto: "Antes / después" }]} />
            )}
          </header>

          {!verImagenes ? (
            <div className="grid min-h-60 place-items-center rounded-card bg-sunken p-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <EyeOff className="size-8 text-muted" />
                <p className="font-semibold">{clinico.cantidadPanoramicas ? `Tiene ${clinico.cantidadPanoramicas} panorámica${clinico.cantidadPanoramicas > 1 ? "s" : ""}` : "No tiene panorámicas"}</p>
                <p className="max-w-sm text-sm text-muted">Las radiografías son datos médicos: solo los odontólogos y el administrador pueden verlas.</p>
              </div>
            </div>
          ) : !actual ? (
            <div className="grid min-h-60 place-items-center rounded-card bg-sunken p-6 text-center">
              <div className="flex flex-col items-center gap-2"><ImageOff className="size-8 text-muted" /><p className="font-semibold">Aún no hay panorámicas</p><p className="text-sm text-muted">Súbela desde el panel de la derecha.</p></div>
            </div>
          ) : modo === "comparar" && antes && despues ? (
            <Comparador antes={antes} despues={despues} />
          ) : (
            <VisorPanoramica
              panoramica={actual}
              marcadores={marcadoresActual}
              sugerencias={sugActual}
              piezaActiva={pieza}
              onElegirPieza={elegir}
              puedeEditar={puedeEditar}
              iaActiva={iaActiva}
              pacienteId={paciente.id}
              pidiendo={pidiendo}
              onPedirSugerencias={() => iniciarIA(() => ejecutar(() => pedirSugerencias(actual.id, paciente.id)))}
            />
          )}

          <AnimatePresence>
            {verImagenes && sugActual.some((s) => s.decision === "pendiente") && modo === "ver" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-2 overflow-hidden rounded-card border-2 border-dashed border-warn/50 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-warn"><Sparkles className="size-4" /> {AVISO_SUGERENCIA}</p>
                {sugActual.filter((s) => s.decision === "pendiente").map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-tile bg-raised p-3">
                    <span className="grid size-10 place-items-center rounded-full bg-warn/15 text-sm font-bold text-warn">{s.pieza_fdi}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{s.descripcion}</p>
                      <p className="text-xs text-muted">Confianza del asistente: {Math.round(s.confianza * 100)}% · asistente de prueba</p>
                    </div>
                    <button onClick={() => ejecutar(() => decidirSugerencia(s, "aceptada", paciente.id))} className="flex h-10 items-center gap-1.5 rounded-chip bg-lime px-4 text-sm font-semibold text-on-lime transition hover:-translate-y-0.5"><Check className="size-4" /> Aceptar</button>
                    <button onClick={() => ejecutar(() => decidirSugerencia(s, "descartada", paciente.id))} className="flex h-10 items-center gap-1.5 rounded-chip bg-card px-4 text-sm font-semibold transition hover:text-danger"><X className="size-4" /> Descartar</button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        <aside className="flex flex-col gap-4">
          <motion.section className="flex flex-col gap-3 rounded-card bg-royal p-5 text-on-royal" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <h3 className="text-lg font-semibold">Historial</h3>
            {verImagenes ? (
              panoramicas.length ? (
                <ul className="flex flex-col gap-2">
                  {panoramicas.map((p, i) => {
                    const on = p.id === actual?.id && modo === "ver";
                    return (
                      <motion.li key={p.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="flex items-center gap-2">
                        <button onClick={() => { setActualId(p.id); setModo("ver"); }} className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-tile p-2.5 text-left transition", on ? "bg-lime text-on-lime" : "bg-night hover:bg-black/60")}>
                          <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold", on ? "bg-on-lime text-lime" : "bg-royal-deep")}>{Number(p.tomada_en.slice(8))}</span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{fechaCorta(p.tomada_en)} {p.tomada_en.slice(0, 4)}</span>
                            <span className={cn("block truncate text-xs", on ? "text-on-lime/70" : "text-white/65")}>{p.nota ?? "Sin nota"}</span>
                          </span>
                        </button>
                        {puedeEditar && !p.es_ejemplo && (
                          <button onClick={() => confirm("¿Eliminar esta panorámica?") && ejecutar(() => eliminarPanoramica(p.id, paciente.id))} aria-label="Eliminar panorámica" className="grid size-10 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </motion.li>
                    );
                  })}
                </ul>
              ) : <p className="text-sm text-white/75">Sin panorámicas todavía.</p>
            ) : <p className="text-sm text-white/75">{clinico.cantidadPanoramicas} registrada(s).</p>}
          </motion.section>
          {puedeEditar && <SubirPanoramica pacienteId={paciente.id} doctores={doctores} doctorPorDefecto={null} />}
        </aside>
      </div>

      {/* --------- Odontograma --------- */}
      <motion.section className="card flex flex-col gap-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Odontograma</h3>
            <p className="text-sm text-muted">Toca una pieza para ver o cambiar su estado. Numeración FDI.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chips etiqueta="Dentición" valor={denticion} onCambio={setDenticion} opciones={[{ valor: "adulto", texto: "Adulto" }, { valor: "temporal", texto: "Temporal" }]} />
            {puedeEditar && (
              <button onClick={cotizar} disabled={cotizando || res.pendientes === 0} className="flex h-11 items-center gap-2 rounded-chip bg-royal px-5 text-sm font-semibold text-on-royal transition hover:-translate-y-0.5 hover:bg-royal-deep disabled:opacity-50">
                <FileText className="size-4" /> {cotizando ? "Armando…" : "Crear cotización desde odontograma"}
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-3 divide-x divide-hairline rounded-card bg-raised py-4">
          {[
            { t: "Pendientes", v: res.pendientes, c: "text-coral", barra: "bg-coral" },
            { t: "Tratadas", v: res.tratadas, c: "text-info", barra: "bg-info" },
            { t: "Sanas", v: res.sanas, c: "text-lime", barra: "bg-lime" },
          ].map((x) => (
            <div key={x.t} className="flex flex-col gap-1 px-4 sm:px-6">
              <span className="text-sm text-muted">{x.t}</span>
              <Contador valor={x.v} className={cn("text-3xl font-bold tabular-nums sm:text-[2.6rem] sm:leading-none", x.c)} />
              <span className="mt-1 h-1.5 overflow-hidden rounded-chip bg-card">
                <motion.span className={cn("block h-full origin-left rounded-chip", x.barra)} initial={{ scaleX: 0 }} animate={{ scaleX: x.v / res.total }} transition={{ duration: 1, delay: 0.3 }} />
              </span>
              <span className="text-xs text-faint">de {res.total} piezas</span>
            </div>
          ))}
        </div>

        <Odontograma denticion={denticion} piezas={piezas} piezasConMarcador={piezasConMarcador} activa={pieza} onElegir={elegir} />
        <Leyenda />
      </motion.section>

      <PanelPieza
        numero={pieza}
        abierto={panelAbierto}
        onCerrar={() => setPanelAbierto(false)}
        pieza={piezas.find((p) => p.pieza_fdi === pieza)}
        eventos={eventos.filter((e) => e.pieza_fdi === pieza)}
        marcadores={marcadores.filter((m) => m.pieza_fdi === pieza)}
        pacienteId={paciente.id}
        puedeEditar={puedeEditar}
        onVerMarcador={verMarcador}
      />
    </div>
  );
}
