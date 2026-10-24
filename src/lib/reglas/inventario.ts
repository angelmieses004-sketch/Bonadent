/** Reglas del inventario: estado de existencias y aplicación de movimientos. */
import type { ArticuloInventario } from "@/tipos";

export type EstadoStock = "agotado" | "bajo" | "ok";

export function estadoStock(a: Pick<ArticuloInventario, "cantidad" | "minimo">): EstadoStock {
  if (a.cantidad <= 0) return "agotado";
  if (a.minimo > 0 && a.cantidad <= a.minimo) return "bajo";
  return "ok";
}

/** Nueva existencia tras sumar/restar (o fijar un valor exacto). Nunca negativa. */
export function aplicarMovimiento(actual: number, delta: number, exacto?: number | null): { nueva: number; tipo: "entrada" | "salida" | "ajuste" } {
  const nueva = Math.round((exacto ?? actual + delta) * 100) / 100;
  if (!Number.isFinite(nueva) || nueva < 0) throw new Error("No hay suficientes existencias");
  return { nueva, tipo: exacto != null ? "ajuste" : nueva >= actual ? "entrada" : "salida" };
}

/** Artículos por reponer, primero los agotados y luego los más cerca del mínimo. */
export function porReponer(articulos: ArticuloInventario[]): ArticuloInventario[] {
  return articulos
    .filter((a) => a.activo && estadoStock(a) !== "ok")
    .sort((a, b) => a.cantidad / Math.max(1, a.minimo) - b.cantidad / Math.max(1, b.minimo));
}

export const CATEGORIAS_INVENTARIO = ["Ortodoncia", "Higiene", "Protección", "Anestesia", "Materiales", "Desechables", "Otros"];
export const UNIDADES = ["unidades", "cajas", "paquetes", "bolsas", "frascos", "botellas", "rollos", "pares", "tubos", "carpules", "jeringas"];
