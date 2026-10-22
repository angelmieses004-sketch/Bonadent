"use client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Dialogo } from "@/components/ui/dialogo";
import { Aviso, BotonEnviar, Campo, Selector } from "@/components/ui/formulario";
import { avisar } from "@/components/ui/avisos";
import { buscarChoque } from "@/lib/reglas/agenda";
import { hora12 } from "@/lib/fechas";
import type { Cita, Doctor, Paciente, Servicio } from "@/tipos";
import { aplazarCita, guardarCita } from "@/app/(app)/agenda/acciones";

export interface ValoresCita {
  id?: string;
  paciente_id?: string;
  doctor_id?: string;
  fecha?: string;
  hora?: string;
  duracion_min?: number;
  tratamiento?: string;
  cada_dias?: number;
  pieza_fdi?: number | null;
}

interface Contexto { pacientes: Paciente[]; doctores: Doctor[]; servicios: Servicio[]; citas: Cita[] }

/** Crear o editar una cita, con aviso en vivo si choca con otra del mismo odontólogo. */
export function FormularioCita({ abierto, onCambio, valores, ctx }: { abierto: boolean; onCambio: (v: boolean) => void; valores: ValoresCita; ctx: Contexto }) {
  const [estado, accion] = useActionState(guardarCita, undefined);
  const [f, setF] = useState(valores);
  const [previos, setPrevios] = useState(valores);
  if (valores !== previos) { setPrevios(valores); setF(valores); }
  useEffect(() => {
    if (estado?.ok) { avisar(estado.ok); onCambio(false); }
  }, [estado, onCambio]);

  const choque = useMemo(
    () => (f.doctor_id && f.fecha && f.hora ? buscarChoque({ id: f.id ?? "", doctor_id: f.doctor_id, fecha: f.fecha, hora: f.hora, duracion_min: f.duracion_min ?? 30 }, ctx.citas) : undefined),
    [f, ctx.citas],
  );
  const pacienteChoque = choque && ctx.pacientes.find((p) => p.id === choque.paciente_id);
  const cambiar = (k: keyof ValoresCita) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [k]: ["duracion_min", "cada_dias"].includes(k) ? Number(e.target.value) : e.target.value }));

  return (
    <Dialogo abierto={abierto} onCambio={onCambio} titulo={f.id ? "Editar cita" : "Nueva cita"} descripcion="Los recordatorios por WhatsApp se programan solos." ancho="max-w-xl">
      <form action={accion} className="grid gap-4 sm:grid-cols-2" noValidate>
        <input type="hidden" name="id" value={f.id ?? ""} />
        <input type="hidden" name="pieza_fdi" value={f.pieza_fdi ?? ""} />
        <Selector etiqueta="Paciente" name="paciente_id" value={f.paciente_id ?? ""} onChange={cambiar("paciente_id")} className="sm:col-span-2" required>
          <option value="">Elegir paciente…</option>
          {ctx.pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Selector>
        <Selector etiqueta="Odontólogo" name="doctor_id" value={f.doctor_id ?? ""} onChange={cambiar("doctor_id")} required>
          <option value="">Elegir…</option>
          {ctx.doctores.filter((d) => d.activo).map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </Selector>
        <div>
          <Campo etiqueta="Tratamiento" name="tratamiento" value={f.tratamiento ?? ""} onChange={cambiar("tratamiento")} list="lista-servicios" placeholder="Ej.: Control de brackets" required />
          <datalist id="lista-servicios">{ctx.servicios.map((s) => <option key={s.id} value={s.nombre} />)}</datalist>
        </div>
        <Campo etiqueta="Fecha" name="fecha" type="date" value={f.fecha ?? ""} onChange={cambiar("fecha")} required />
        <Campo etiqueta="Hora" name="hora" type="time" step={900} value={f.hora ?? "09:00"} onChange={cambiar("hora")} required />
        <Campo etiqueta="Duración (min)" name="duracion_min" type="number" min={5} step={5} value={f.duracion_min ?? 30} onChange={cambiar("duracion_min")} />
        <Selector etiqueta="Se repite" name="cada_dias" value={String(f.cada_dias ?? 0)} onChange={cambiar("cada_dias")}>
          <option value="0">No se repite</option>
          <option value="7">Cada 7 días</option>
          <option value="15">Cada 15 días (brackets)</option>
          <option value="21">Cada 21 días</option>
          <option value="30">Cada 30 días</option>
        </Selector>
        {choque && (
          <p role="alert" className="flex items-start gap-2 rounded-tile bg-warn/12 px-4 py-3 text-sm text-warn sm:col-span-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Choque de horario: ese odontólogo ya tiene a {pacienteChoque?.nombre ?? "otro paciente"} a las {hora12(choque.hora)} ({choque.duracion_min} min). Puedes guardar igual si es a propósito.
          </p>
        )}
        <div className="sm:col-span-2"><Aviso error={estado?.error} /></div>
        <BotonEnviar variante="azul" className="h-12 sm:col-span-2">{f.id ? "Guardar cambios" : "Agendar cita"}</BotonEnviar>
      </form>
    </Dialogo>
  );
}

/** Aplazar: nueva fecha y hora; los recordatorios se reprograman. */
export function FormularioAplazar({ cita, onCerrar, ctx }: { cita: Cita | null; onCerrar: () => void; ctx: Contexto }) {
  const [estado, accion] = useActionState(aplazarCita, undefined);
  const [f, setF] = useState({ fecha: cita?.fecha ?? "", hora: cita?.hora ?? "" });
  const [citaPrevia, setCitaPrevia] = useState(cita);
  if (cita !== citaPrevia) { setCitaPrevia(cita); if (cita) setF({ fecha: cita.fecha, hora: cita.hora }); }
  useEffect(() => { if (estado?.ok) { avisar(estado.ok); onCerrar(); } }, [estado, onCerrar]);
  const choque = cita && f.fecha ? buscarChoque({ ...cita, fecha: f.fecha, hora: f.hora }, ctx.citas) : undefined;
  const paciente = cita && ctx.pacientes.find((p) => p.id === cita.paciente_id);

  return (
    <Dialogo abierto={Boolean(cita)} onCambio={(v) => !v && onCerrar()} titulo="Aplazar cita" descripcion={paciente ? `${paciente.nombre} · ${cita?.tratamiento}` : undefined}>
      <form action={accion} className="grid gap-4 sm:grid-cols-2" noValidate>
        <input type="hidden" name="id" value={cita?.id ?? ""} />
        <Campo etiqueta="Nueva fecha" name="fecha" type="date" value={f.fecha} onChange={(e) => setF((x) => ({ ...x, fecha: e.target.value }))} required />
        <Campo etiqueta="Nueva hora" name="hora" type="time" step={900} value={f.hora} onChange={(e) => setF((x) => ({ ...x, hora: e.target.value }))} required />
        {choque && <p role="alert" className="rounded-tile bg-warn/12 px-4 py-3 text-sm text-warn sm:col-span-2">Ese horario choca con otra cita del mismo odontólogo a las {hora12(choque.hora)}.</p>}
        <p className="text-sm text-muted sm:col-span-2">Los recordatorios de 3 días antes y del mismo día se reprograman para la nueva fecha.</p>
        <div className="sm:col-span-2"><Aviso error={estado?.error} /></div>
        <BotonEnviar className="h-12 sm:col-span-2">Aplazar</BotonEnviar>
      </form>
    </Dialogo>
  );
}
