/**
 * PANORÁMICA SINTÉTICA DE PRUEBA, dibujada por código. No es de ningún paciente real.
 * Imita el aspecto de una radiografía panorámica (gris sobre negro) para probar el visor.
 */
import type { EstadoPieza } from "@/tipos";
import { ADULTO, tipoPieza } from "./reglas/odontograma";

const W = 1600;
const H = 800;

/** Posición (0–1) de la corona de cada pieza sobre la imagen, siguiendo la curva de la sonrisa. */
export function posicionPieza(fdi: number): { x: number; y: number } {
  const superior = ADULTO.superior.indexOf(fdi);
  const fila = superior >= 0 ? superior : ADULTO.inferior.indexOf(fdi);
  const x = 0.15 + (fila / 15) * 0.7;
  const curva = Math.pow((x - 0.5) / 0.35, 2) * 0.06;
  return { x, y: superior >= 0 ? 0.475 - curva : 0.535 - curva };
}

type Marca = Partial<Record<number, EstadoPieza>>;

function diente(fdi: number, marca?: EstadoPieza): string {
  if (marca === "ausente") return "";
  const { x, y } = posicionPieza(fdi);
  const cx = x * W, cy = y * H;
  const arriba = ADULTO.superior.includes(fdi);
  const s = arriba ? -1 : 1; // las raíces van hacia afuera
  const tipo = tipoPieza(fdi);
  const ancho = tipo === "molar" ? 76 : tipo === "premolar" ? 62 : tipo === "canino" ? 56 : 52;
  const altoCorona = tipo === "molar" ? 64 : 72;
  const largoRaiz = tipo === "canino" ? 190 : tipo === "molar" ? 140 : 160;
  const coronaY = arriba ? cy - altoCorona : cy;
  const base = arriba ? cy - altoCorona : cy + altoCorona;
  const punta = base + s * largoRaiz;

  const raices = tipo === "molar"
    ? [
        `M${cx - ancho / 2 + 6},${base} Q${cx - ancho / 2 + 2},${(base + punta) / 2} ${cx - 12},${punta} L${cx - 4},${base}Z`,
        `M${cx + 4},${base} L${cx + 12},${punta} Q${cx + ancho / 2 - 2},${(base + punta) / 2} ${cx + ancho / 2 - 6},${base}Z`,
      ]
    : [`M${cx - ancho / 2 + 5},${base} Q${cx - ancho / 4},${(base + punta) / 2} ${cx},${punta} Q${cx + ancho / 4},${(base + punta) / 2} ${cx + ancho / 2 - 5},${base}Z`];

  let extra = "";
  if (marca === "implante") {
    // Tornillo de titanio: muy radiopaco, con roscas
    const roscas = Array.from({ length: 7 }, (_, i) => {
      const yy = base + s * (14 + i * 15);
      return `<rect x="${cx - 13}" y="${yy - 3}" width="26" height="6" rx="3" fill="#fff"/>`;
    }).join("");
    return `<g filter="url(#nitido)"><rect x="${cx - 10}" y="${Math.min(base, base + s * 115)}" width="20" height="115" rx="8" fill="#f2f2f2"/>${roscas}
      <rect x="${cx - ancho / 2}" y="${coronaY}" width="${ancho}" height="${altoCorona}" rx="16" fill="#e8e8e8"/></g>`;
  }
  if (marca === "corona") extra += `<rect x="${cx - ancho / 2 - 2}" y="${coronaY - 2}" width="${ancho + 4}" height="${altoCorona + 4}" rx="18" fill="#fafafa" opacity=".95"/>`;
  if (marca === "resina") extra += `<ellipse cx="${cx}" cy="${arriba ? cy - 14 : cy + 14}" rx="${ancho / 4}" ry="10" fill="#fff" opacity=".95"/>`;
  if (marca === "endodoncia") extra += `<path d="M${cx},${base} L${cx},${punta - s * 8}" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`;
  if (marca === "caries" || marca === "extraccion") extra += `<ellipse cx="${cx + ancho / 6}" cy="${arriba ? cy - 18 : cy + 18}" rx="${ancho / 5}" ry="9" fill="#0b0b0b" opacity=".85"/>`;

  return `<g>
    ${raices.map((d) => `<path d="${d}" fill="url(#raiz)"/>`).join("")}
    <rect x="${cx - ancho / 2}" y="${coronaY}" width="${ancho}" height="${altoCorona}" rx="${tipo === "incisivo" ? 14 : 18}" fill="url(#esmalte${arriba ? "S" : "I"})"/>
    <rect x="${cx - ancho / 2 + 9}" y="${coronaY + (arriba ? 12 : 8)}" width="${ancho - 18}" height="${altoCorona - 20}" rx="10" fill="#6d6d6d" opacity=".55"/>
    ${extra}
  </g>`;
}

const VARIANTES: Record<string, Marca> = {
  "p3-antes": { 36: "caries", 46: "caries", 26: "caries", 48: "caries" },
  "p3-despues": { 16: "resina", 36: "endodoncia", 46: "caries", 26: "caries", 18: "ausente", 48: "extraccion" },
  p6: { 14: "implante", 11: "corona", 21: "corona", 37: "resina" },
};

export function svgPanoramica(variante: string): string {
  const marca = VARIANTES[variante] ?? {};
  const dientes = [...ADULTO.superior, ...ADULTO.inferior].map((n) => diente(n, marca[n])).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="hueso" cx="50%" cy="52%" r="55%">
      <stop offset="0" stop-color="#7a7a7a"/><stop offset=".55" stop-color="#3e3e3e"/><stop offset="1" stop-color="#050505"/>
    </radialGradient>
    <linearGradient id="raiz" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b9b9b9"/><stop offset="1" stop-color="#8a8a8a"/></linearGradient>
    <linearGradient id="esmalteS" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#c8c8c8"/><stop offset="1" stop-color="#ededed"/></linearGradient>
    <linearGradient id="esmalteI" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ededed"/><stop offset="1" stop-color="#c8c8c8"/></linearGradient>
    <filter id="rayosx" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="2.4"/>
    </filter>
    <filter id="nitido"><feGaussianBlur stdDeviation=".8"/></filter>
    <filter id="grano">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/>
      <feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .5 0"/>
    </filter>
    <radialGradient id="vineta" cx="50%" cy="50%" r="62%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".95"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#020202"/>
  <ellipse cx="${W / 2}" cy="${H * 0.52}" rx="${W * 0.47}" ry="${H * 0.46}" fill="url(#hueso)"/>
  <g filter="url(#rayosx)" opacity=".9">
    <path d="M${W * 0.08},${H * 0.62} Q${W / 2},${H * 1.08} ${W * 0.92},${H * 0.62} L${W * 0.86},${H * 0.58} Q${W / 2},${H * 0.95} ${W * 0.14},${H * 0.58}Z" fill="#9c9c9c" opacity=".45"/>
    <ellipse cx="${W / 2}" cy="${H * 0.2}" rx="${W * 0.16}" ry="${H * 0.1}" fill="#111" opacity=".75"/>
    <ellipse cx="${W * 0.3}" cy="${H * 0.25}" rx="${W * 0.1}" ry="${H * 0.09}" fill="#1a1a1a" opacity=".6"/>
    <ellipse cx="${W * 0.7}" cy="${H * 0.25}" rx="${W * 0.1}" ry="${H * 0.09}" fill="#1a1a1a" opacity=".6"/>
    <rect x="${W * 0.035}" y="${H * 0.18}" width="${W * 0.045}" height="${H * 0.6}" rx="30" fill="#8a8a8a" opacity=".35"/>
    <rect x="${W * 0.92}" y="${H * 0.18}" width="${W * 0.045}" height="${H * 0.6}" rx="30" fill="#8a8a8a" opacity=".35"/>
    ${dientes}
  </g>
  <rect width="${W}" height="${H}" filter="url(#grano)" opacity=".22"/>
  <rect width="${W}" height="${H}" fill="url(#vineta)"/>
  <text x="${W - 24}" y="${H - 22}" text-anchor="end" font-family="sans-serif" font-size="20" fill="#5b5b5b">IMAGEN SINTÉTICA DE PRUEBA · NO ES DE UN PACIENTE</text>
</svg>`;
}
