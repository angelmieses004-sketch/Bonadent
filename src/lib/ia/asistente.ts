/**
 * ASISTENTE DE PRUEBA (sin IA real).
 * Responde con preguntas y respuestas fijas, como un FAQ, para poder demostrar el flujo.
 * Cuando se cierre la venta se reemplaza por un modelo real (con visión) llamado desde el servidor;
 * la interfaz de estas funciones no cambia.
 */
import { normalizar } from "@/lib/texto";
import type { EstadoPieza, ItemCotizacion, Servicio } from "@/tipos";

export const MODO_IA = "prueba" as const;

/* ---------------- Cotizaciones ---------------- */

/** Frases de ejemplo que se muestran como "preguntas frecuentes" en el editor de cotizaciones. */
export const EJEMPLOS_COTIZACION = [
  "Limpieza y 2 resinas",
  "Endodoncia con corona de porcelana",
  "Brackets metálicos con 2 radiografías, 10% de descuento",
  "Consulta, limpieza y blanqueamiento",
  "Implante dental con perno",
];

const NUMEROS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };

/** Convierte texto libre en renglones del catálogo. Solo usa servicios del catálogo, con su precio exacto. */
export function armarCotizacion(texto: string, servicios: Servicio[]): { items: ItemCotizacion[]; descuento_pct: number; respuesta: string } {
  const t = normalizar(texto);
  const items: ItemCotizacion[] = [];
  for (const s of servicios.filter((x) => x.activo)) {
    const clave = normalizar(s.nombre).split(/[ (]/)[0]!;
    const raiz = clave.length > 5 ? clave.slice(0, -1) : clave; // "resina" encuentra "resinas"
    const m = t.match(new RegExp(`(?:(\\d+|${Object.keys(NUMEROS).join("|")})\\s+)?${raiz}`));
    if (m) items.push({ nombre: s.nombre, precio: Number(s.precio), cantidad: m[1] ? NUMEROS[m[1]] ?? Number(m[1]) : 1, servicio_id: s.id });
  }
  const desc = t.match(/(\d{1,2})\s*%/);
  const descuento_pct = desc ? Math.min(100, Number(desc[1])) : 0;
  const respuesta = items.length
    ? `Encontré ${items.length} ${items.length === 1 ? "servicio" : "servicios"} del catálogo${descuento_pct ? ` y un ${descuento_pct}% de descuento` : ""}. Revísalos antes de guardar.`
    : "No encontré servicios del catálogo en ese texto. Prueba con uno de los ejemplos o agrégalos de la lista.";
  return { items, descuento_pct, respuesta };
}

/* ---------------- Panorámicas ---------------- */

export interface SugerenciaPrueba {
  x: number;
  y: number;
  radio: number;
  pieza_fdi: number;
  estado_sugerido: EstadoPieza;
  descripcion: string;
  confianza: number;
}

/** Respuestas fijas: zonas a revisar sobre las piezas indicadas. */
const PLANTILLAS: Omit<SugerenciaPrueba, "x" | "y">[] = [
  { radio: 0.045, pieza_fdi: 46, estado_sugerido: "caries", descripcion: "Zona radiolúcida en la cara oclusal: revisar posible caries.", confianza: 0.82 },
  { radio: 0.05, pieza_fdi: 26, estado_sugerido: "corona", descripcion: "Pérdida de estructura coronal: evaluar si necesita corona.", confianza: 0.71 },
  { radio: 0.05, pieza_fdi: 38, estado_sugerido: "extraccion", descripcion: "Cordal en posición desfavorable: valorar extracción.", confianza: 0.64 },
];

export function sugerirZonas(posicion: (fdi: number) => { x: number; y: number }): SugerenciaPrueba[] {
  return PLANTILLAS.map((p) => {
    const { x, y } = posicion(p.pieza_fdi);
    return { ...p, x, y: y + (p.pieza_fdi > 30 ? 0.04 : -0.04) };
  });
}

export const AVISO_SUGERENCIA = "Sugerencia, no es diagnóstico. Confirmar por el odontólogo.";
