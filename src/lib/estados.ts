/** Etiquetas y colores de estado de cotización (compartidos por varias pantallas). */
export const ESTADO_COT = {
  borrador: { texto: "Borrador", clase: "bg-raised text-muted" },
  enviada: { texto: "Enviada", clase: "bg-info/15 text-info" },
  aprobada: { texto: "Aprobada", clase: "bg-ok/15 text-ok" },
  rechazada: { texto: "Rechazada", clase: "bg-danger/12 text-danger" },
} as const;
