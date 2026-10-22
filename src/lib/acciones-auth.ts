"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env, supabaseConfigurado } from "@/lib/env";
import { COOKIE_VISTA_PREVIA } from "@/lib/sesion";
import { supabaseServidor } from "@/lib/supabase/server";

export type EstadoForm = { error?: string; ok?: string } | undefined;

const credenciales = z.object({
  correo: z.email("Escribe un correo válido"),
  contrasena: z.string().min(6, "La contraseña tiene al menos 6 caracteres"),
  volver: z.string().optional(),
});

/** Solo permite volver a rutas internas. */
const destinoSeguro = (v?: string) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/resumen");

export async function iniciarSesion(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const datos = credenciales.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: datos.error.issues[0]?.message };

  const sb = await supabaseServidor();
  const { data: sesion, error } = await sb.auth.signInWithPassword({ email: datos.data.correo, password: datos.data.contrasena });
  if (error) return { error: "Correo o contraseña incorrectos" };

  const { data: perfil } = await sb.from("perfiles").select("activo").eq("id", sesion.user.id).maybeSingle();
  if (!perfil?.activo) {
    await sb.auth.signOut();
    return { error: "Tu cuenta no tiene acceso a la clínica. Pide una invitación al administrador." };
  }
  redirect(destinoSeguro(datos.data.volver));
}

export async function entrarVistaPrevia(fd: FormData) {
  if (supabaseConfigurado) redirect("/login");
  const rol = z.enum(["admin", "odontologo", "recepcion"]).catch("admin").parse(fd.get("rol"));
  (await cookies()).set(COOKIE_VISTA_PREVIA, rol, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 8 });
  redirect("/resumen");
}

export async function cerrarSesion() {
  if (supabaseConfigurado) {
    const sb = await supabaseServidor();
    await sb.auth.signOut();
  } else {
    (await cookies()).delete(COOKIE_VISTA_PREVIA);
  }
  redirect("/login");
}

export async function pedirRecuperacion(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const correo = z.email("Escribe un correo válido").safeParse(fd.get("correo"));
  if (!correo.success) return { error: correo.error.issues[0]?.message };
  if (!supabaseConfigurado) return { error: "Disponible al conectar Supabase." };

  const sb = await supabaseServidor();
  await sb.auth.resetPasswordForEmail(correo.data, { redirectTo: `${env.siteUrl}/auth/confirmar?siguiente=/cuenta/contrasena` });
  // Misma respuesta exista o no la cuenta, para no revelar correos.
  return { ok: "Si el correo está registrado, te llegará un enlace para crear una contraseña nueva." };
}

const nuevaContrasena = z
  .object({ contrasena: z.string().min(8, "Usa al menos 8 caracteres"), repetir: z.string() })
  .refine((d) => d.contrasena === d.repetir, { message: "Las contraseñas no coinciden", path: ["repetir"] });

export async function guardarContrasena(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const datos = nuevaContrasena.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: datos.error.issues[0]?.message };
  const sb = await supabaseServidor();
  const { error } = await sb.auth.updateUser({ password: datos.data.contrasena });
  if (error) return { error: "El enlace venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?»." };
  redirect("/resumen");
}
