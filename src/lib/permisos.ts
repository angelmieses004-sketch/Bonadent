import type { Rol } from "@/tipos";

/**
 * Qué puede hacer cada rol en la interfaz. La seguridad real está en las políticas RLS;
 * esto solo decide qué se muestra.
 */
const PERMISOS = {
  ver_caja: ["admin", "recepcion"],
  ver_radiografias: ["admin", "odontologo"],
  editar_odontograma: ["admin", "odontologo"],
  gestionar_equipo: ["admin"],
  gestionar_catalogo: ["admin"],
  ver_auditoria: ["admin"],
  enviar_recordatorios: ["admin", "recepcion"],
} as const satisfies Record<string, readonly Rol[]>;

export type Permiso = keyof typeof PERMISOS;

export const puede = (rol: Rol, permiso: Permiso) => (PERMISOS[permiso] as readonly Rol[]).includes(rol);

export const NOMBRE_ROL: Record<Rol, string> = {
  admin: "Administrador",
  odontologo: "Odontólogo",
  recepcion: "Recepción",
};
