"use server";
import { revalidatePath } from "next/cache";
import { requerirRol, requerirUsuario } from "@/lib/sesion";
import { esquemaCotizacion } from "@/lib/esquemas";
import { actualizarCotizacion, crearCotizacion, eliminarCotizacion, leer } from "@/datos/repo";
import { totalCotizacion } from "@/lib/reglas/saldo";
import { armarCotizacion } from "@/lib/ia/asistente";
import { isoDia } from "@/lib/fechas";
import { numeroCot } from "@/lib/mensajes";
import type { EstadoForm } from "@/lib/acciones-auth";
import type { EstadoCotizacion, ItemCotizacion } from "@/tipos";

const refrescar = () => {
  revalidatePath("/cotizaciones", "layout");
  revalidatePath("/resumen");
  revalidatePath("/pacientes", "layout");
};

/** Asistente de prueba: texto → renglones del catálogo. */
export async function asistenteCotizacion(texto: string): Promise<{ items: ItemCotizacion[]; descuento_pct: number; respuesta: string }> {
  await requerirUsuario();
  const d = await leer();
  return armarCotizacion(texto.slice(0, 500), d.servicios);
}

export async function guardarCotizacion(datos: unknown): Promise<EstadoForm & { id?: string }> {
  const u = await requerirUsuario();
  const v = esquemaCotizacion.safeParse(datos);
  if (!v.success) return { error: v.error.issues[0]?.message ?? "Revisa la cotización" };
  const { id, ...q } = v.data;
  const total = totalCotizacion(q.items, q.descuento_pct);
  try {
    if (id) {
      await actualizarCotizacion(id, { ...q, total, notas: q.notas ?? null }, u);
      refrescar();
      return { ok: "Cotización actualizada", id };
    }
    const r = await crearCotizacion({ ...q, notas: q.notas ?? null, total, fecha: isoDia(), estado: "borrador" }, u);
    refrescar();
    return { ok: `${numeroCot(r.numero)} creada`, id: r.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar" };
  }
}

export async function cambiarEstadoCotizacion(id: string, estado: EstadoCotizacion): Promise<EstadoForm> {
  const u = await requerirUsuario();
  if (!["borrador", "enviada", "aprobada", "rechazada"].includes(estado)) return { error: "Estado no válido" };
  try {
    await actualizarCotizacion(id, { estado }, u);
    refrescar();
    return { ok: estado === "aprobada" ? "Aprobada: el total pasó al saldo del paciente" : estado === "rechazada" ? "Marcada como rechazada" : estado === "enviada" ? "Marcada como enviada" : "Vuelve a borrador" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo cambiar" };
  }
}

export async function borrarCotizacion(id: string): Promise<EstadoForm> {
  const u = await requerirRol("admin", "recepcion");
  try {
    await eliminarCotizacion(id, u);
    refrescar();
    return { ok: "Cotización eliminada" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo eliminar" };
  }
}
