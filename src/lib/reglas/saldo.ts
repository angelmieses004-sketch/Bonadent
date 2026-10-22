/** Saldo del paciente = cotizaciones aprobadas − ingresos de caja del paciente (espejo de v_saldos). */
import type { Cotizacion, Movimiento } from "@/tipos";

const redondear = (n: number) => Math.round(n * 100) / 100;

export function saldoPaciente(pacienteId: string, cotizaciones: Pick<Cotizacion, "paciente_id" | "estado" | "total">[], movimientos: Pick<Movimiento, "paciente_id" | "tipo" | "monto">[]): number {
  const cargos = cotizaciones
    .filter((q) => q.paciente_id === pacienteId && q.estado === "aprobada")
    .reduce((a, q) => a + Number(q.total), 0);
  const pagos = movimientos
    .filter((m) => m.paciente_id === pacienteId && m.tipo === "ingreso")
    .reduce((a, m) => a + Number(m.monto), 0);
  return redondear(cargos - pagos);
}

/** Total de una cotización con descuento en %. */
export function totalCotizacion(items: { precio: number; cantidad: number }[], descuentoPct = 0): number {
  const sub = items.reduce((a, i) => a + Number(i.precio) * Number(i.cantidad), 0);
  const pct = Math.min(100, Math.max(0, Number(descuentoPct) || 0));
  return redondear(sub * (1 - pct / 100));
}
