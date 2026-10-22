import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseConfigurado } from "@/lib/env";
import { supabaseServidor } from "@/lib/supabase/server";
import type { Rol, Usuario } from "@/tipos";

/** Cookie que guarda el rol elegido en la vista previa (solo existe cuando no hay Supabase). */
export const COOKIE_VISTA_PREVIA = "bona_vista_previa";

const USUARIOS_PREVIA: Record<Rol, Usuario> = {
  admin: { id: "u-admin", nombre: "Dra. Laura Peña", correo: "admin@ejemplo.do", rol: "admin", esSuperadmin: true, doctorId: "d1", vistaPrevia: true },
  odontologo: { id: "u-odo", nombre: "Dr. Miguel Taveras", correo: "odontologo@ejemplo.do", rol: "odontologo", esSuperadmin: false, doctorId: "d2", vistaPrevia: true },
  recepcion: { id: "u-rec", nombre: "Carmen Reyes", correo: "recepcion@ejemplo.do", rol: "recepcion", esSuperadmin: false, doctorId: null, vistaPrevia: true },
};

/** Usuario actual o null. Se memoriza por petición. */
export const obtenerUsuario = cache(async (): Promise<Usuario | null> => {
  if (!supabaseConfigurado) {
    const rol = (await cookies()).get(COOKIE_VISTA_PREVIA)?.value as Rol | undefined;
    return rol && rol in USUARIOS_PREVIA ? USUARIOS_PREVIA[rol] : null;
  }

  const sb = await supabaseServidor();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;

  const { data: perfil } = await sb
    .from("perfiles")
    .select("nombre, correo, rol, doctor_id, es_superadmin, activo")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!perfil || !perfil.activo) return null;

  return {
    id: data.user.id,
    nombre: perfil.nombre,
    correo: perfil.correo,
    rol: perfil.rol,
    esSuperadmin: perfil.es_superadmin,
    doctorId: perfil.doctor_id,
    vistaPrevia: false,
  };
});

export async function requerirUsuario(): Promise<Usuario> {
  const u = await obtenerUsuario();
  if (!u) redirect("/login");
  return u;
}

export async function requerirRol(...roles: Rol[]): Promise<Usuario> {
  const u = await requerirUsuario();
  if (!roles.includes(u.rol)) redirect("/resumen?sin-permiso=1");
  return u;
}
