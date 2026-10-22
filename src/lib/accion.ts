import "server-only";
import type { z } from "zod";
import type { EstadoForm } from "@/lib/acciones-auth";

/** Convierte FormData en objeto (los campos repetidos se vuelven arreglos). */
export function leerForm(fd: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    o[k] = k in o ? [o[k], v].flat() : v;
  }
  return o;
}

export function validar<T extends z.ZodType>(esquema: T, datos: unknown): { ok: true; datos: z.infer<T> } | { ok: false; estado: EstadoForm } {
  const r = esquema.safeParse(datos);
  if (r.success) return { ok: true, datos: r.data };
  return { ok: false, estado: { error: r.error.issues[0]?.message ?? "Revisa los datos" } };
}

/** Ejecuta y traduce errores a un mensaje para el formulario. */
export async function intentar(fn: () => Promise<unknown>, ok: string): Promise<NonNullable<EstadoForm>> {
  try {
    await fn();
    return { ok };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar. Intenta de nuevo." };
  }
}
