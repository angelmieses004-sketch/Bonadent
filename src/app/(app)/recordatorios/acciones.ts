"use server";
import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/sesion";
import { intentar } from "@/lib/accion";
import { marcarRecordatorio } from "@/datos/repo";
import type { EstadoForm } from "@/lib/acciones-auth";

/** Envío manual de respaldo: recepción lo manda por WhatsApp y queda como enviado (canal manual). */
export async function marcarEnviadoManual(id: string): Promise<EstadoForm> {
  const u = await requerirRol("admin", "recepcion");
  const r = await intentar(() => marcarRecordatorio(id, "enviado", "manual", null, u), "Recordatorio marcado como enviado");
  revalidatePath("/recordatorios");
  revalidatePath("/resumen");
  return r;
}

export async function volverAPendiente(id: string): Promise<EstadoForm> {
  const u = await requerirRol("admin", "recepcion");
  const r = await intentar(() => marcarRecordatorio(id, "pendiente", "manual", null, u), "Vuelve a la lista de pendientes");
  revalidatePath("/recordatorios");
  return r;
}
