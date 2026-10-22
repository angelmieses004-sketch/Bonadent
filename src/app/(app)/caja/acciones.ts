"use server";
import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/sesion";
import { esquemaMovimiento } from "@/lib/esquemas";
import { intentar, leerForm, validar } from "@/lib/accion";
import { actualizar, crear, eliminar, subirArchivo } from "@/datos/repo";
import type { EstadoForm } from "@/lib/acciones-auth";

const TIPOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const refrescar = () => {
  revalidatePath("/caja");
  revalidatePath("/resumen");
  revalidatePath("/pacientes", "layout");
};

export async function guardarMovimiento(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirRol("admin", "recepcion");
  const datos = leerForm(fd);
  delete datos.comprobante;
  const v = validar(esquemaMovimiento, datos);
  if (!v.ok) return v.estado;
  const archivo = fd.get("comprobante");
  if (archivo instanceof File && archivo.size > 0) {
    if (!TIPOS.includes(archivo.type)) return { error: "El comprobante debe ser foto (JPG/PNG) o PDF" };
    if (archivo.size > 10 * 1024 * 1024) return { error: "El comprobante pesa más de 10 MB" };
  }
  const { id, ...fila } = v.datos;
  const r = await intentar(async () => {
    const comprobante = archivo instanceof File && archivo.size > 0 ? await subirArchivo("comprobantes", archivo) : undefined;
    const cambios = comprobante ? { ...fila, comprobante_path: comprobante } : fila;
    if (id) await actualizar("movimientos", id, cambios, u);
    else await crear("movimientos", cambios, u);
  }, v.datos.tipo === "ingreso" ? "Cobro registrado" : "Pago registrado");
  refrescar();
  return r;
}

export async function eliminarMovimiento(id: string): Promise<EstadoForm> {
  const u = await requerirRol("admin", "recepcion");
  const r = await intentar(() => eliminar("movimientos", id, u), "Movimiento eliminado");
  refrescar();
  return r;
}
