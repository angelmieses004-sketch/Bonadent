"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { motion } from "motion/react";
import { Pencil, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RD } from "@/lib/dinero";
import { ESTADOS } from "@/lib/reglas/odontograma";
import { TEXTOS_POR_DEFECTO } from "@/lib/mensajes";
import type { Clinica, DiaSemana, Doctor, Servicio } from "@/tipos";
import { Dialogo } from "@/components/ui/dialogo";
import { AreaTexto, Aviso, BotonEnviar, Campo, Selector } from "@/components/ui/formulario";
import { avisar, ejecutar } from "@/components/ui/avisos";
import { Avatar } from "@/components/bona/avatar";
import type { EstadoForm } from "@/lib/acciones-auth";
import {
  alternarDoctor, alternarIA, alternarServicio, borrarDatosEjemplo, guardarDatosClinica, guardarDoctor, guardarHorario,
  guardarServicio, guardarTextos, reiniciarDemo,
} from "./acciones";

function useAviso(estado: EstadoForm, alTerminar?: () => void) {
  useEffect(() => {
    if (estado?.ok) { avisar(estado.ok); alTerminar?.(); }
  }, [estado]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function FormClinica({ clinica }: { clinica: Clinica }) {
  const [estado, accion] = useActionState(guardarDatosClinica, undefined);
  useAviso(estado);
  return (
    <form action={accion} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Campo etiqueta="Nombre de la clínica" name="nombre" defaultValue={clinica.nombre} className="sm:col-span-2" required />
      <Campo etiqueta="Teléfono" name="telefono" defaultValue={clinica.telefono ?? ""} inputMode="tel" />
      <Campo etiqueta="Meta de ingresos del mes (RD$)" name="meta_ingresos_mes" type="number" min={0} defaultValue={clinica.meta_ingresos_mes} />
      <Campo etiqueta="Dirección (va en los recordatorios)" name="direccion" defaultValue={clinica.direccion ?? ""} className="sm:col-span-2" />
      <p className="rounded-tile border-2 border-dashed border-hairline p-4 text-sm text-muted sm:col-span-2">Logo de la clínica: se agrega al conectar Supabase (bucket privado «logos»). Mientras tanto, el PDF usa la inicial de la clínica.</p>
      <div className="sm:col-span-2"><Aviso error={estado?.error} /></div>
      <BotonEnviar className="h-12 sm:col-span-2">Guardar</BotonEnviar>
    </form>
  );
}

export function ListaDoctores({ doctores }: { doctores: Doctor[] }) {
  const [editando, setEditando] = useState<Partial<Doctor> | null>(null);
  const [estado, accion] = useActionState(guardarDoctor, undefined);
  useAviso(estado, () => setEditando(null));
  return (
    <div className="flex flex-col gap-2">
      {doctores.map((d) => (
        <div key={d.id} className={cn("flex flex-wrap items-center gap-3 rounded-tile bg-raised p-3", !d.activo && "opacity-55")}>
          <Avatar nombre={d.nombre} color={d.color} className="size-11" />
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{d.nombre}</p><p className="truncate text-sm text-muted">{d.especialidad}{d.es_ejemplo ? " · ejemplo" : ""}</p></div>
          <button onClick={() => setEditando(d)} aria-label={`Editar ${d.nombre}`} className="grid size-10 place-items-center rounded-full bg-card text-muted hover:text-ink"><Pencil className="size-4" /></button>
          <button onClick={() => ejecutar(() => alternarDoctor(d.id, !d.activo))} className={cn("h-10 rounded-chip px-3 text-sm", d.activo ? "text-danger hover:bg-danger/10" : "text-ok hover:bg-ok/10")}>{d.activo ? "Desactivar" : "Activar"}</button>
        </div>
      ))}
      <button onClick={() => setEditando({ color: "#d4f75a" })} className="group grid min-h-16 place-items-center rounded-tile border-2 border-dashed border-lime/50 text-sm text-muted transition hover:border-lime hover:text-ink">
        <span className="flex items-center gap-2"><Plus className="size-4 transition-transform group-hover:rotate-90" /> Agregar odontólogo</span>
      </button>
      <Dialogo abierto={Boolean(editando)} onCambio={(v) => !v && setEditando(null)} titulo={editando?.id ? "Editar odontólogo" : "Nuevo odontólogo"}>
        <form key={editando?.id ?? "nuevo"} action={accion} className="grid gap-4" noValidate>
          <input type="hidden" name="id" value={editando?.id ?? ""} />
          <Campo etiqueta="Nombre" name="nombre" defaultValue={editando?.nombre ?? ""} placeholder="Dra. …" required />
          <Campo etiqueta="Especialidad" name="especialidad" defaultValue={editando?.especialidad ?? ""} />
          <Campo etiqueta="Color en la agenda" name="color" type="color" defaultValue={editando?.color ?? "#d4f75a"} className="[&_input]:h-12 [&_input]:p-1" />
          <Aviso error={estado?.error} />
          <BotonEnviar className="h-12">Guardar</BotonEnviar>
        </form>
      </Dialogo>
    </div>
  );
}

const MAPEO = [
  ["", "No se usa en el odontograma"],
  ["caries", `Caries / resina indicada`],
  ["extraccion", ESTADOS.extraccion.nombre],
  ["endodoncia", ESTADOS.endodoncia.nombre],
  ["corona", ESTADOS.corona.nombre],
  ["implante", ESTADOS.implante.nombre],
] as const;

export function ListaServicios({ servicios }: { servicios: Servicio[] }) {
  const [editando, setEditando] = useState<Partial<Servicio> | null>(null);
  const [estado, accion] = useActionState(guardarServicio, undefined);
  useAviso(estado, () => setEditando(null));
  return (
    <div className="flex flex-col gap-2">
      {servicios.map((s, i) => (
        <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }} className={cn("flex flex-wrap items-center gap-3 rounded-tile bg-raised p-3", !s.activo && "opacity-55")}>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{s.nombre}</p>
            <p className="truncate text-xs text-muted">{s.estado_odontograma ? `Odontograma: ${MAPEO.find(([v]) => v === s.estado_odontograma)?.[1]}` : "—"}{s.es_ejemplo ? " · ejemplo" : ""}</p>
          </div>
          <span className="font-bold tabular-nums">{RD(s.precio)}</span>
          <button onClick={() => setEditando(s)} aria-label={`Editar ${s.nombre}`} className="grid size-10 place-items-center rounded-full bg-card text-muted hover:text-ink"><Pencil className="size-4" /></button>
          <button onClick={() => ejecutar(() => alternarServicio(s.id, !s.activo))} aria-label={s.activo ? "Retirar" : "Activar"} className={cn("grid size-10 place-items-center rounded-full", s.activo ? "text-muted hover:bg-danger/10 hover:text-danger" : "text-ok hover:bg-ok/10")}>
            {s.activo ? <Trash2 className="size-4" /> : <RotateCcw className="size-4" />}
          </button>
        </motion.div>
      ))}
      <button onClick={() => setEditando({})} className="group grid min-h-16 place-items-center rounded-tile border-2 border-dashed border-lime/50 text-sm text-muted transition hover:border-lime hover:text-ink">
        <span className="flex items-center gap-2"><Plus className="size-4 transition-transform group-hover:rotate-90" /> Agregar servicio</span>
      </button>
      <Dialogo abierto={Boolean(editando)} onCambio={(v) => !v && setEditando(null)} titulo={editando?.id ? "Editar servicio" : "Nuevo servicio"} descripcion="El precio se usa en las cotizaciones automáticas.">
        <form key={editando?.id ?? "nuevo"} action={accion} className="grid gap-4" noValidate>
          <input type="hidden" name="id" value={editando?.id ?? ""} />
          <Campo etiqueta="Servicio" name="nombre" defaultValue={editando?.nombre ?? ""} required />
          <Campo etiqueta="Precio (RD$)" name="precio" type="number" min={0} step="0.01" defaultValue={editando?.precio ?? ""} required />
          <Selector etiqueta="Cotizar desde el odontograma cuando la pieza tenga…" name="estado_odontograma" defaultValue={editando?.estado_odontograma ?? ""}>
            {MAPEO.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </Selector>
          <Aviso error={estado?.error} />
          <BotonEnviar className="h-12">Guardar</BotonEnviar>
        </form>
      </Dialogo>
    </div>
  );
}

const NOMBRE_DIA: Record<DiaSemana, string> = { lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves", vie: "Viernes", sab: "Sábado", dom: "Domingo" };

export function FormHorario({ horario }: { horario: Clinica["horario"] }) {
  const [estado, accion] = useActionState(guardarHorario, undefined);
  const [abiertos, setAbiertos] = useState(() => Object.fromEntries(Object.entries(horario).map(([d, h]) => [d, Boolean(h)])));
  useAviso(estado);
  return (
    <form action={accion} className="flex flex-col gap-2" noValidate>
      {(Object.keys(NOMBRE_DIA) as DiaSemana[]).map((d) => (
        <div key={d} className="flex flex-wrap items-center gap-3 rounded-tile bg-raised p-3">
          <label className="flex w-36 cursor-pointer items-center gap-3 text-sm font-semibold">
            <input type="checkbox" name={`${d}_abierto`} checked={abiertos[d]} onChange={(e) => setAbiertos((a) => ({ ...a, [d]: e.target.checked }))} className="size-5 accent-[var(--color-lime)]" />
            {NOMBRE_DIA[d]}
          </label>
          {abiertos[d] ? (
            <div className="flex items-center gap-2 text-sm">
              <input type="time" name={`${d}_abre`} defaultValue={horario[d]?.[0] ?? "08:00"} aria-label={`${NOMBRE_DIA[d]} abre`} className="h-10 rounded-tile bg-sunken px-3" />
              <span className="text-muted">a</span>
              <input type="time" name={`${d}_cierra`} defaultValue={horario[d]?.[1] ?? "18:00"} aria-label={`${NOMBRE_DIA[d]} cierra`} className="h-10 rounded-tile bg-sunken px-3" />
            </div>
          ) : <span className="text-sm text-muted">Cerrado</span>}
        </div>
      ))}
      <Aviso error={estado?.error} />
      <BotonEnviar className="mt-2 h-12">Guardar horario</BotonEnviar>
    </form>
  );
}

export function FormTextos({ textos, clinica }: { textos: Clinica["textos_recordatorio"]; clinica: string }) {
  const [estado, accion] = useActionState(guardarTextos, undefined);
  const [previo, setPrevio] = useState(textos.previo ?? TEXTOS_POR_DEFECTO.previo);
  const [hoy, setHoy] = useState(textos.hoy ?? TEXTOS_POR_DEFECTO.hoy);
  useAviso(estado);
  const ejemplo = (t: string) => t.replace(/\{(\w+)\}/g, (_, k: string) => ({ nombre: "Ana", fecha: "jueves 24 de octubre", hora: "9:00 a. m.", doctor: "Dra. Laura Peña", clinica, direccion: "Calle del Sol #45", tratamiento: "Control de brackets", dias: "3 días" } as Record<string, string>)[k] ?? `{${k}}`);
  return (
    <form action={accion} className="grid gap-5 lg:grid-cols-2" noValidate>
      <p className="text-sm text-muted lg:col-span-2">Variables: <code className="text-lime">{"{nombre} {fecha} {hora} {doctor} {clinica} {direccion} {tratamiento} {dias}"}</code>. Para WhatsApp Business, las plantillas oficiales deben coincidir con lo aprobado por Meta.</p>
      <div className="flex flex-col gap-2">
        <AreaTexto etiqueta="3 días antes" name="previo" value={previo} onChange={(e) => setPrevio(e.target.value)} className="[&_textarea]:min-h-36" />
        <p className="rounded-tile bg-sunken p-3 text-xs whitespace-pre-wrap text-muted">{ejemplo(previo)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <AreaTexto etiqueta="El mismo día" name="hoy" value={hoy} onChange={(e) => setHoy(e.target.value)} className="[&_textarea]:min-h-36" />
        <p className="rounded-tile bg-sunken p-3 text-xs whitespace-pre-wrap text-muted">{ejemplo(hoy)}</p>
      </div>
      <div className="flex gap-2 lg:col-span-2">
        <button type="button" onClick={() => { setPrevio(TEXTOS_POR_DEFECTO.previo); setHoy(TEXTOS_POR_DEFECTO.hoy); }} className="h-12 rounded-chip bg-raised px-4 text-sm font-semibold">Restaurar textos</button>
        <BotonEnviar className="h-12 flex-1">Guardar textos</BotonEnviar>
      </div>
      <div className="lg:col-span-2"><Aviso error={estado?.error} /></div>
    </form>
  );
}

export function InterruptorIA({ activa }: { activa: boolean }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      <button
        role="switch"
        aria-checked={activa}
        disabled={pendiente}
        onClick={() => iniciar(() => ejecutar(() => alternarIA(!activa)))}
        className="flex items-center gap-4 rounded-card bg-raised p-4 text-left"
      >
        <span className={cn("relative h-8 w-14 shrink-0 rounded-chip transition-colors", activa ? "bg-lime" : "bg-card")}>
          <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className={cn("absolute top-1 size-6 rounded-full", activa ? "right-1 bg-on-lime" : "left-1 bg-muted")} />
        </span>
        <span>
          <span className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-lime" /> Sugerencias con IA en panorámicas</span>
          <span className="text-sm text-muted">{activa ? "Activadas" : "Apagadas (por defecto)"} · modo de prueba con respuestas fijas</span>
        </span>
      </button>
      <ul className="flex flex-col gap-1.5 text-sm text-muted">
        <li>• Siempre se muestran como «Sugerencia, no es diagnóstico. Confirmar por el odontólogo».</li>
        <li>• Nunca cambian el odontograma solas: el odontólogo acepta o descarta cada una.</li>
        <li>• Al cerrar la venta se conecta un modelo real con visión, llamado solo desde el servidor.</li>
      </ul>
    </div>
  );
}

export function ZonaEjemplo({ vistaPrevia }: { vistaPrevia: boolean }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Borra todo lo marcado como <span className="rounded-chip border border-dashed border-warn/60 px-1.5 text-warn">ejemplo</span> antes de empezar con los datos reales.</p>
      <div className="flex flex-wrap gap-2">
        <button disabled={pendiente} onClick={() => confirm("¿Borrar todos los datos de ejemplo?") && iniciar(() => ejecutar(borrarDatosEjemplo))} className="flex h-11 items-center gap-2 rounded-chip px-4 text-sm font-semibold text-danger transition hover:bg-danger/10">
          <Trash2 className="size-4" /> Borrar datos de ejemplo
        </button>
        {vistaPrevia && (
          <button disabled={pendiente} onClick={() => iniciar(() => ejecutar(reiniciarDemo))} className="flex h-11 items-center gap-2 rounded-chip bg-raised px-4 text-sm font-semibold transition hover:bg-card">
            <RotateCcw className="size-4" /> Reiniciar la vista previa
          </button>
        )}
      </div>
    </div>
  );
}
