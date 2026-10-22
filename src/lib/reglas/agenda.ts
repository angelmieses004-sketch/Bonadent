/** Reglas de agenda: choque de horario y citas que se repiten. */
import { sumarDias } from "@/lib/fechas";
import type { Cita } from "@/tipos";
import { esActiva } from "./recordatorios";

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Devuelve la cita activa del mismo odontólogo y día que se solapa en horario con la propuesta.
 * Dos citas chocan si sus intervalos [inicio, inicio + duración) se cruzan.
 */
export function buscarChoque(
  propuesta: Pick<Cita, "id" | "doctor_id" | "fecha" | "hora" | "duracion_min">,
  citas: Cita[],
): Cita | undefined {
  if (!propuesta.doctor_id) return undefined;
  const ini = minutos(propuesta.hora);
  const fin = ini + (propuesta.duracion_min || 30);
  return citas.find((o) => {
    if (o.id === propuesta.id || o.doctor_id !== propuesta.doctor_id || o.fecha !== propuesta.fecha || !esActiva(o)) return false;
    const oi = minutos(o.hora);
    const of = oi + (o.duracion_min || 30);
    return ini < of && oi < fin;
  });
}

/** Al completar una cita que se repite cada N días, la siguiente queda en la misma hora, N días después. */
export function siguienteCitaRepetida(cita: Cita): Omit<Cita, "id"> | null {
  if (!cita.cada_dias || cita.cada_dias <= 0) return null;
  const resto: Partial<Cita> = { ...cita };
  delete resto.id;
  return {
    ...(resto as Omit<Cita, "id">),
    fecha: sumarDias(cita.fecha, cita.cada_dias),
    estado: "programada",
    aplazamientos: 0,
    es_ejemplo: false,
  };
}

const DIA: Record<number, "dom" | "lun" | "mar" | "mie" | "jue" | "vie" | "sab"> = { 0: "dom", 1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie", 6: "sab" };
const aHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * Horarios libres del mismo odontólogo para ofrecer al aplazar.
 * Recorre los días siguientes dentro del horario de la clínica, en bloques de la duración de la cita,
 * y devuelve como máximo `cuantos` (uno por día para dar variedad).
 */
export function horariosLibres(
  cita: Pick<Cita, "id" | "doctor_id" | "fecha" | "duracion_min">,
  citas: Cita[],
  horario: Record<string, [string, string] | null>,
  desde: string,
  cuantos = 3,
): { fecha: string; hora: string }[] {
  const out: { fecha: string; hora: string }[] = [];
  const dur = cita.duracion_min || 30;
  for (let i = 1; i <= 21 && out.length < cuantos; i++) {
    const fecha = sumarDias(desde, i);
    const h = horario[DIA[new Date(`${fecha}T12:00:00Z`).getUTCDay()]];
    if (!h) continue;
    for (let m = minutos(h[0]); m + dur <= minutos(h[1]); m += 30) {
      const hora = aHora(m);
      if (!buscarChoque({ id: cita.id, doctor_id: cita.doctor_id, fecha, hora, duracion_min: dur }, citas)) {
        out.push({ fecha, hora });
        break;
      }
    }
  }
  return out;
}
