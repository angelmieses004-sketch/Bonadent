/** Fechas en la zona horaria de la clínica (República Dominicana, UTC−4 sin horario de verano). */
export const ZONA = "America/Santo_Domingo";
const LOCALE = "es-DO";

/** "2026-10-21" del instante dado, visto desde Santo Domingo. */
export function isoDia(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Suma días a un "YYYY-MM-DD" sin depender de la zona del servidor. */
export function sumarDias(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n, 12));
  return t.toISOString().slice(0, 10);
}

export function diferenciaDias(desde: string, hasta: string): number {
  const a = Date.UTC(...(desde.split("-").map(Number) as [number, number, number]));
  const b = Date.UTC(...(hasta.split("-").map(Number) as [number, number, number]));
  return Math.round((b - a) / 864e5);
}

const aFecha = (iso: string) => new Date(`${iso}T12:00:00-04:00`);

export const fechaLarga = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" }).format(aFecha(iso));

export const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: ZONA, day: "numeric", month: "short" }).format(aFecha(iso));

export const nombreMes = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: ZONA, month: "long", year: "numeric" }).format(aFecha(iso));

/** "09:30" → "9:30 a. m." */
export function hora12(hhmm: string): string {
  const [H, M] = hhmm.split(":").map(Number);
  const sufijo = H >= 12 ? "p. m." : "a. m.";
  return `${H % 12 || 12}:${String(M).padStart(2, "0")} ${sufijo}`;
}

export const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Saludo según la hora en Santo Domingo. */
export function saludo(d: Date = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: ZONA, hour: "numeric", hour12: false }).format(d));
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}
