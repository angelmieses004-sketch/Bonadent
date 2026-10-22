import "server-only";
import { supabaseConfigurado } from "@/lib/env";
import { supabaseServidor } from "@/lib/supabase/server";
import type { Rol } from "@/tipos";

export interface Miembro { id: string; nombre: string; correo: string; rol: Rol; activo: boolean; doctor: string | null }
export interface InvitacionPendiente { id: string; nombre: string; correo: string; rol: Rol; creado_en: string }

export async function cargarEquipo(): Promise<{ miembros: Miembro[]; invitaciones: InvitacionPendiente[]; doctores: { id: string; nombre: string }[] }> {
  if (!supabaseConfigurado) {
    return {
      miembros: [
        { id: "u-admin", nombre: "Dra. Laura Peña", correo: "admin@ejemplo.do", rol: "admin", activo: true, doctor: "Dra. Laura Peña" },
        { id: "u-odo", nombre: "Dr. Miguel Taveras", correo: "odontologo@ejemplo.do", rol: "odontologo", activo: true, doctor: "Dr. Miguel Taveras" },
        { id: "u-rec", nombre: "Carmen Reyes", correo: "recepcion@ejemplo.do", rol: "recepcion", activo: true, doctor: null },
      ],
      invitaciones: [{ id: "i1", nombre: "Dra. Carla Núñez", correo: "carla@ejemplo.do", rol: "odontologo", creado_en: new Date().toISOString() }],
      doctores: [{ id: "d3", nombre: "Dra. Carla Núñez" }],
    };
  }

  const sb = await supabaseServidor();
  const [perfiles, invitaciones, doctores] = await Promise.all([
    sb.from("perfiles").select("id, nombre, correo, rol, activo, doctor:doctores(nombre)").order("nombre"),
    sb.from("invitaciones").select("id, nombre, correo, rol, creado_en").is("aceptada_en", null).order("creado_en", { ascending: false }),
    sb.from("doctores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  return {
    miembros: (perfiles.data ?? []).map((p) => ({
      id: p.id, nombre: p.nombre, correo: p.correo, rol: p.rol, activo: p.activo,
      doctor: (p.doctor as unknown as { nombre: string } | null)?.nombre ?? null,
    })),
    invitaciones: invitaciones.data ?? [],
    doctores: doctores.data ?? [],
  };
}
