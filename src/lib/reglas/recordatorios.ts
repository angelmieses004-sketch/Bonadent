/**
 * Reglas de recordatorios (espejo del trigger sincronizar_recordatorios en Postgres).
 * Cada cita activa tiene dos: "previo" (3 días antes) y "hoy" (el mismo día).
 */
import { diferenciaDias, sumarDias } from "@/lib/fechas";
import type { Cita, Recordatorio } from "@/tipos";

export const ESTADOS_ACTIVOS: Cita["estado"][] = ["programada", "confirmada", "aplazada"];
export const esActiva = (c: Pick<Cita, "estado">) => ESTADOS_ACTIVOS.includes(c.estado);

export function generarRecordatorios(cita: Pick<Cita, "id" | "fecha" | "estado">): Recordatorio[] {
  const estado = esActiva(cita) ? "pendiente" : "cancelado";
  return [
    { id: `${cita.id}-previo`, cita_id: cita.id, tipo: "previo", fecha_envio: sumarDias(cita.fecha, -3), estado },
    { id: `${cita.id}-hoy`, cita_id: cita.id, tipo: "hoy", fecha_envio: cita.fecha, estado },
  ];
}

export interface RecordatorioDelDia {
  recordatorio: Recordatorio;
  cita: Cita;
  /** Días que faltan para la cita (0 = hoy). */
  dias: number;
  /** true si el aviso previo debió salir antes (la cita se creó con menos de 3 días). */
  atrasado: boolean;
}

/**
 * Recordatorios que deben salir hoy:
 *  - "hoy": su cita es hoy.
 *  - "previo": ya llegó su fecha de envío y la cita sigue en el futuro (1 a 3 días).
 * Los fallidos se reintentan.
 */
export function recordatoriosDelDia(hoy: string, recordatorios: Recordatorio[], citas: Cita[]): RecordatorioDelDia[] {
  const porId = new Map(citas.map((c) => [c.id, c]));
  const out: RecordatorioDelDia[] = [];
  for (const r of recordatorios) {
    if (r.estado !== "pendiente" && r.estado !== "fallido") continue;
    const cita = porId.get(r.cita_id);
    if (!cita || !esActiva(cita)) continue;
    if (r.tipo === "hoy" && cita.fecha === hoy) {
      out.push({ recordatorio: r, cita, dias: 0, atrasado: false });
    } else if (r.tipo === "previo" && r.fecha_envio <= hoy && cita.fecha > hoy) {
      const dias = diferenciaDias(hoy, cita.fecha);
      out.push({ recordatorio: r, cita, dias, atrasado: dias < 3 });
    }
  }
  return out.sort((a, b) => (a.cita.fecha + a.cita.hora).localeCompare(b.cita.fecha + b.cita.hora));
}
