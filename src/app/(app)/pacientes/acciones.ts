"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirRol, requerirUsuario } from "@/lib/sesion";
import { esquemaPaciente } from "@/lib/esquemas";
import { intentar, leerForm, validar } from "@/lib/accion";
import { actualizar, crear, eliminar } from "@/datos/repo";
import type { EstadoForm } from "@/lib/acciones-auth";

export async function guardarPaciente(_: EstadoForm, fd: FormData): Promise<EstadoForm & { id?: string }> {
  const u = await requerirUsuario();
  const v = validar(esquemaPaciente, leerForm(fd));
  if (!v.ok) return v.estado ?? {};
  const { id, ...fila } = v.datos;
  let nuevoId = id ?? undefined;
  const r = await intentar(async () => {
    if (id) await actualizar("pacientes", id, fila, u);
    else nuevoId = await crear("pacientes", fila, u);
  }, id ? "Paciente actualizado" : "Paciente creado");
  revalidatePath("/pacientes", "layout");
  return { ...r, id: nuevoId };
}

export async function eliminarPaciente(id: string): Promise<EstadoForm> {
  const u = await requerirRol("admin");
  const r = await intentar(() => eliminar("pacientes", id, u), "Paciente eliminado");
  if (r?.error) return r;
  revalidatePath("/pacientes", "layout");
  redirect("/pacientes");
}
