"use server";
import { revalidatePath } from "next/cache";
import { requerirRol, requerirUsuario } from "@/lib/sesion";
import { esquemaAplazar, esquemaCita } from "@/lib/esquemas";
import { intentar, leerForm, validar } from "@/lib/accion";
import { actualizar, crear, eliminar, leer } from "@/datos/repo";
import { siguienteCitaRepetida } from "@/lib/reglas/agenda";
import { fechaCorta } from "@/lib/fechas";
import type { EstadoForm } from "@/lib/acciones-auth";
import type { EstadoCita } from "@/tipos";

const refrescar = () => {
  revalidatePath("/agenda");
  revalidatePath("/resumen");
  revalidatePath("/recordatorios");
  revalidatePath("/pacientes", "layout");
};

export async function guardarCita(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const v = validar(esquemaCita, leerForm(fd));
  if (!v.ok) return v.estado;
  const { id, pieza_fdi, ...fila } = v.datos;
  const datos = { ...fila, pieza_fdi: pieza_fdi ?? null };
  const r = await intentar(
    () => (id ? actualizar("citas", id, datos, u) : crear("citas", { ...datos, estado: "programada", aplazamientos: 0 }, u)),
    id ? "Cita actualizada" : `Cita agendada para el ${fechaCorta(datos.fecha)}`,
  );
  refrescar();
  return r;
}

const ESTADOS: EstadoCita[] = ["programada", "confirmada", "aplazada", "completada", "cancelada"];

export async function cambiarEstadoCita(id: string, estado: EstadoCita): Promise<EstadoForm> {
  const u = await requerirUsuario();
  if (!ESTADOS.includes(estado)) return { error: "Estado no válido" };
  const r = await intentar(() => actualizar("citas", id, { estado }, u), estado === "confirmada" ? "Cita confirmada" : estado === "cancelada" ? "Cita cancelada" : "Cita actualizada");
  refrescar();
  return r;
}

/** Completar: si la cita se repite cada N días, crea la siguiente con la misma hora. */
export async function completarCita(id: string): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const cita = (await leer()).citas.find((c) => c.id === id);
  if (!cita) return { error: "No se encontró la cita" };
  const r = await intentar(async () => {
    await actualizar("citas", id, { estado: "completada" }, u);
    const sig = siguienteCitaRepetida({ ...cita, estado: "completada" });
    if (sig) await crear("citas", { ...sig, cita_origen_id: cita.id }, u);
  }, cita.cada_dias > 0 ? `Completada. Próxima cita el ${fechaCorta(siguienteCitaRepetida(cita)!.fecha)}` : "Cita completada");
  refrescar();
  return r;
}

export async function aplazarCita(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const v = validar(esquemaAplazar, leerForm(fd));
  if (!v.ok) return v.estado;
  const cita = (await leer()).citas.find((c) => c.id === v.datos.id);
  if (!cita) return { error: "No se encontró la cita" };
  const r = await intentar(
    () => actualizar("citas", cita.id, { fecha: v.datos.fecha, hora: v.datos.hora, estado: "aplazada", aplazamientos: (cita.aplazamientos ?? 0) + 1 }, u),
    `Cita aplazada al ${fechaCorta(v.datos.fecha)}. Los recordatorios se reprogramaron.`,
  );
  refrescar();
  return r;
}

export async function eliminarCita(id: string): Promise<EstadoForm> {
  const u = await requerirRol("admin", "recepcion");
  const r = await intentar(() => eliminar("citas", id, u), "Cita eliminada");
  refrescar();
  return r;
}
