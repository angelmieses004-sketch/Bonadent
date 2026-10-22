/**
 * Lectura centralizada de variables de entorno.
 * Si faltan las de Supabase, la app arranca en "vista previa" con datos ficticios
 * para poder ver el diseño sin backend. Nunca se mezclan datos reales con la vista previa.
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export const supabaseConfigurado = Boolean(env.supabaseUrl && env.supabaseKey);

/** Solo en el servidor. */
export function secretKey(): string {
  const k = process.env.SUPABASE_SECRET_KEY;
  if (!k) throw new Error("Falta SUPABASE_SECRET_KEY en .env.local");
  return k;
}
