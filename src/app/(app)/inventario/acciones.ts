"use server";
import { revalidatePath } from "next/cache";
import { requerirRol, requerirUsuario } from "@/lib/sesion";
import { esquemaAjuste, esquemaArticulo } from "@/lib/esquemas";
import { intentar, leerForm, validar } from "@/lib/accion";
import { actualizar, crear, eliminar, moverInventario } from "@/datos/repo";
import type { EstadoForm } from "@/lib/acciones-auth";

const refrescar = () => {
  revalidatePath("/inventario");
  revalidatePath("/resumen");
};

/** Botones − / +: suma o resta de a 1 (o lo que se indique). Todo el equipo puede usarlos. */
export async function moverExistencia(id: string, delta: number): Promise<{ error?: string; cantidad?: number }> {
  const u = await requerirUsuario();
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 10000) return { error: "Cantidad no válida" };
  try {
    const cantidad = await moverInventario(id, delta, delta > 0 ? "Entrada rápida" : "Salida rápida", null, u);
    refrescar();
    return { cantidad };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo actualizar" };
  }
}

/** Ajuste con motivo: entrada (compra), salida (uso) o cantidad exacta (conteo). */
export async function ajustarExistencia(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const v = validar(esquemaAjuste, leerForm(fd));
  if (!v.ok) return v.estado;
  const { id, modo, cantidad, motivo } = v.datos;
  if (modo !== "exacto" && cantidad === 0) return { error: "Escribe cuántas entran o salen" };
  const r = await intentar(
    () => moverInventario(id, modo === "salida" ? -cantidad : modo === "entrada" ? cantidad : 0, motivo ?? null, modo === "exacto" ? cantidad : null, u),
    modo === "entrada" ? `Se agregaron ${cantidad}` : modo === "salida" ? `Se sacaron ${cantidad}` : `Existencia ajustada a ${cantidad}`,
  );
  refrescar();
  return r;
}

export async function guardarArticulo(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirRol("admin", "recepcion");
  const v = validar(esquemaArticulo, leerForm(fd));
  if (!v.ok) return v.estado;
  const { id, cantidad, ...fila } = v.datos;
  const r = await intentar(async () => {
    if (id) await actualizar("articulos", id, fila, u);
    else {
      const nuevo = await crear("articulos", { ...fila, cantidad: 0, activo: true }, u);
      if (cantidad && cantidad > 0) await moverInventario(nuevo, cantidad, "Existencia inicial", null, u);
    }
  }, id ? "Artículo actualizado" : "Artículo agregado al inventario");
  refrescar();
  return r;
}

export async function eliminarArticulo(id: string): Promise<EstadoForm> {
  const u = await requerirRol("admin", "recepcion");
  const r = await intentar(() => eliminar("articulos", id, u), "Artículo eliminado del inventario");
  refrescar();
  return r;
}
