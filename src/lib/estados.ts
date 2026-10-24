import type { Cita } from "@/tipos";

/** Etiquetas y colores de estado de cotización (compartidos por varias pantallas). */
export const ESTADO_COT = {
  borrador: { texto: "Borrador", clase: "bg-raised text-muted" },
  enviada: { texto: "Enviada", clase: "bg-info/15 text-info" },
  aprobada: { texto: "Aprobada", clase: "bg-ok/15 text-ok" },
  rechazada: { texto: "Rechazada", clase: "bg-danger/12 text-danger" },
} as const;

/** Etiquetas y colores de estado de cita. Vive aquí (no en un componente "use client") para poder usarse en páginas del servidor. */
export const ESTADO_CITA: Record<Cita["estado"], { texto: string; clase: string; barra: string }> = {
  programada: { texto: "Por confirmar", clase: "bg-info/15 text-info", barra: "bg-info" },
  confirmada: { texto: "Confirmada", clase: "bg-ok/15 text-ok", barra: "bg-ok" },
  aplazada: { texto: "Aplazada", clase: "bg-warn/15 text-warn", barra: "bg-warn" },
  completada: { texto: "Completada", clase: "bg-raised text-muted", barra: "bg-faint" },
  cancelada: { texto: "Cancelada", clase: "bg-danger/12 text-danger", barra: "bg-danger" },
};
