/** "José Almonte" → "jose almonte" para buscar sin tildes ni mayúsculas. */
export const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const coincide = (texto: string, q: string) => normalizar(texto).includes(normalizar(q.trim()));

/** Edad en años a partir de "YYYY-MM-DD". */
export function edad(nacimiento: string | null, hoy: string): number | null {
  if (!nacimiento) return null;
  const [y, m, d] = nacimiento.split("-").map(Number);
  const [hy, hm, hd] = hoy.split("-").map(Number);
  return hy - y - (hm < m || (hm === m && hd < d) ? 1 : 0);
}
