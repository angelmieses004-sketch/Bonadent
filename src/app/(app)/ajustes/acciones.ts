"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env, supabaseConfigurado } from "@/lib/env";
import { requerirRol } from "@/lib/sesion";
import { supabaseAdmin, supabaseServidor } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/acciones-auth";
import { esquemaClinica, esquemaDoctor, esquemaServicio } from "@/lib/esquemas";
import { intentar, leerForm, validar } from "@/lib/accion";
import { actualizar, borrarEjemplos, crear, guardarClinica, reiniciarMemoria } from "@/datos/repo";
import type { DiaSemana } from "@/tipos";


const SIN_SUPABASE: EstadoForm = { error: "En la vista previa no se guarda nada. Conecta Supabase para invitar al equipo." };
const rol = z.enum(["admin", "odontologo", "recepcion"], { message: "Elige un rol" });

const invitacion = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre"),
  correo: z.email("Escribe un correo válido").transform((c) => c.toLowerCase()),
  rol,
  doctor_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
});

export async function invitarMiembro(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await requerirRol("admin");
  if (!supabaseConfigurado) return SIN_SUPABASE;

  const datos = invitacion.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: datos.error.issues[0]?.message };
  const { nombre, correo, rol: r, doctor_id } = datos.data;

  const sb = await supabaseServidor();
  const { data: inv, error } = await sb
    .from("invitaciones")
    .insert({ nombre, correo, rol: r, doctor_id: r === "odontologo" ? doctor_id ?? null : null })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "Ya hay una invitación pendiente para ese correo." : "No se pudo crear la invitación." };

  const { error: errCorreo } = await supabaseAdmin().auth.admin.inviteUserByEmail(correo, {
    redirectTo: `${env.siteUrl}/auth/confirmar?siguiente=/cuenta/contrasena`,
    data: { nombre },
  });
  if (errCorreo) {
    await sb.from("invitaciones").delete().eq("id", inv.id);
    return { error: errCorreo.message.includes("already") ? "Ese correo ya tiene cuenta." : "No se pudo enviar el correo de invitación." };
  }

  revalidatePath("/ajustes");
  return { ok: `Invitación enviada a ${correo}.` };
}

export async function cambiarRol(fd: FormData): Promise<void> {
  const yo = await requerirRol("admin");
  if (!supabaseConfigurado) return;
  const id = z.uuid().parse(fd.get("id"));
  if (id === yo.id) return; // nadie se quita su propio rol de administrador
  const nuevo = rol.parse(fd.get("rol"));
  const sb = await supabaseServidor();
  await sb.from("perfiles").update({ rol: nuevo }).eq("id", id);
  revalidatePath("/ajustes");
}

export async function alternarActivo(fd: FormData): Promise<void> {
  const yo = await requerirRol("admin");
  if (!supabaseConfigurado) return;
  const id = z.uuid().parse(fd.get("id"));
  if (id === yo.id) return;
  const sb = await supabaseServidor();
  const { data } = await sb.from("perfiles").select("activo").eq("id", id).single();
  if (data) await sb.from("perfiles").update({ activo: !data.activo }).eq("id", id);
  revalidatePath("/ajustes");
}

export async function cancelarInvitacion(fd: FormData): Promise<void> {
  await requerirRol("admin");
  if (!supabaseConfigurado) return;
  const id = z.uuid().parse(fd.get("id"));
  const sb = await supabaseServidor();
  await sb.from("invitaciones").delete().eq("id", id).is("aceptada_en", null);
  revalidatePath("/ajustes");
}

/* ---------------- Clínica, catálogo y configuración ---------------- */

const refrescarTodo = () => revalidatePath("/", "layout");

export async function guardarDatosClinica(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirRol("admin");
  const v = validar(esquemaClinica, leerForm(fd));
  if (!v.ok) return v.estado;
  const r = await intentar(() => guardarClinica(v.datos, u), "Datos de la clínica guardados");
  refrescarTodo();
  return r;
}

export async function guardarDoctor(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirRol("admin");
  const v = validar(esquemaDoctor, leerForm(fd));
  if (!v.ok) return v.estado;
  const { id, ...fila } = v.datos;
  const r = await intentar(() => (id ? actualizar("doctores", id, fila, u) : crear("doctores", { ...fila, activo: true }, u)), id ? "Odontólogo actualizado" : "Odontólogo agregado");
  refrescarTodo();
  return r;
}

export async function alternarDoctor(id: string, activo: boolean): Promise<EstadoForm> {
  const u = await requerirRol("admin");
  const r = await intentar(() => actualizar("doctores", id, { activo }, u), activo ? "Odontólogo activado" : "Odontólogo desactivado (su historial se conserva)");
  refrescarTodo();
  return r;
}

export async function guardarServicio(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirRol("admin");
  const v = validar(esquemaServicio, leerForm(fd));
  if (!v.ok) return v.estado;
  const { id, ...fila } = v.datos;
  const r = await intentar(() => (id ? actualizar("servicios", id, fila, u) : crear("servicios", { ...fila, activo: true }, u)), id ? "Servicio actualizado" : "Servicio agregado al catálogo");
  refrescarTodo();
  return r;
}

export async function alternarServicio(id: string, activo: boolean): Promise<EstadoForm> {
  const u = await requerirRol("admin");
  const r = await intentar(() => actualizar("servicios", id, { activo }, u), activo ? "Servicio activado" : "Servicio retirado del catálogo");
  refrescarTodo();
  return r;
}

const DIAS: DiaSemana[] = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

export async function guardarHorario(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirRol("admin");
  const horario = {} as Record<DiaSemana, [string, string] | null>;
  for (const d of DIAS) {
    const abre = String(fd.get(`${d}_abre`) ?? ""), cierra = String(fd.get(`${d}_cierra`) ?? "");
    if (fd.get(`${d}_abierto`) !== "on") { horario[d] = null; continue; }
    if (!/^\d{2}:\d{2}$/.test(abre) || !/^\d{2}:\d{2}$/.test(cierra) || abre >= cierra) return { error: "Revisa las horas: la apertura debe ser antes del cierre" };
    horario[d] = [abre, cierra];
  }
  const r = await intentar(() => guardarClinica({ horario }, u), "Horario guardado");
  refrescarTodo();
  return r;
}

export async function guardarTextos(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirRol("admin");
  const previo = String(fd.get("previo") ?? "").trim().slice(0, 900);
  const hoy = String(fd.get("hoy") ?? "").trim().slice(0, 900);
  const r = await intentar(() => guardarClinica({ textos_recordatorio: { previo: previo || undefined, hoy: hoy || undefined } }, u), "Textos guardados");
  refrescarTodo();
  return r;
}

export async function alternarIA(activa: boolean): Promise<EstadoForm> {
  const u = await requerirRol("admin");
  const r = await intentar(() => guardarClinica({ ia_sugerencias: activa }, u), activa ? "Sugerencias con IA activadas (modo de prueba)" : "Sugerencias con IA apagadas");
  refrescarTodo();
  return r;
}

export async function borrarDatosEjemplo(): Promise<EstadoForm> {
  const u = await requerirRol("admin");
  let n = 0;
  const r = await intentar(async () => { n = await borrarEjemplos(u); }, "Datos de ejemplo borrados");
  refrescarTodo();
  return r.ok ? { ok: `${n} registros de ejemplo borrados` } : r;
}

/** Solo vista previa: vuelve a cargar los datos de ejemplo. */
export async function reiniciarDemo(): Promise<EstadoForm> {
  await requerirRol("admin");
  if (supabaseConfigurado) return { error: "Solo disponible en la vista previa" };
  reiniciarMemoria();
  refrescarTodo();
  return { ok: "Vista previa reiniciada con los datos de ejemplo" };
}
