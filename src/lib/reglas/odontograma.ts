/** Odontograma FDI: piezas, estados y conexión con el catálogo de servicios. */
import type { EstadoPieza, ItemCotizacion, PiezaDental, Servicio, Situacion } from "@/tipos";

/** Adulto: 32 piezas. Orden de dibujo: de la derecha del paciente (izquierda en pantalla) a la izquierda. */
export const ADULTO = {
  superior: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  inferior: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
};
/** Temporal (niños): 20 piezas. */
export const TEMPORAL = {
  superior: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
  inferior: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
};
export type Denticion = "adulto" | "temporal";
export const piezasDe = (d: Denticion) => (d === "adulto" ? ADULTO : TEMPORAL);
export const todasLasPiezas = (d: Denticion) => [...piezasDe(d).superior, ...piezasDe(d).inferior];

export const esPiezaValida = (n: number) => {
  const c = Math.floor(n / 10), u = n % 10;
  return (c >= 1 && c <= 4 && u >= 1 && u <= 8) || (c >= 5 && c <= 8 && u >= 1 && u <= 5);
};

/** Tipo de pieza para el dibujo. */
export function tipoPieza(n: number): "molar" | "premolar" | "canino" | "incisivo" {
  const u = n % 10;
  const temporal = Math.floor(n / 10) >= 5;
  if (temporal) return u >= 4 ? "molar" : u === 3 ? "canino" : "incisivo";
  if (u >= 6) return "molar";
  if (u >= 4) return "premolar";
  return u === 3 ? "canino" : "incisivo";
}

export interface InfoEstado {
  nombre: string;
  /** Color de token CSS */
  color: string;
  /** Nombre del ícono de lucide */
  icono: "Check" | "CircleDot" | "Square" | "Activity" | "Crown" | "Anchor" | "CircleOff" | "Scissors";
  /** ¿Se trata con un servicio? */
  tratable: boolean;
  /** Si es un hallazgo siempre está pendiente */
  siemprePendiente: boolean;
}

export const ESTADOS: Record<EstadoPieza, InfoEstado> = {
  sana: { nombre: "Sana", color: "var(--color-ok)", icono: "Check", tratable: false, siemprePendiente: false },
  caries: { nombre: "Caries", color: "var(--color-danger)", icono: "CircleDot", tratable: true, siemprePendiente: true },
  resina: { nombre: "Resina", color: "var(--color-info)", icono: "Square", tratable: true, siemprePendiente: false },
  endodoncia: { nombre: "Endodoncia", color: "var(--color-violet)", icono: "Activity", tratable: true, siemprePendiente: false },
  corona: { nombre: "Corona", color: "var(--color-warn)", icono: "Crown", tratable: true, siemprePendiente: false },
  implante: { nombre: "Implante", color: "var(--color-lime)", icono: "Anchor", tratable: true, siemprePendiente: false },
  ausente: { nombre: "Ausente", color: "var(--color-faint)", icono: "CircleOff", tratable: false, siemprePendiente: false },
  extraccion: { nombre: "Extracción indicada", color: "var(--color-coral)", icono: "Scissors", tratable: true, siemprePendiente: true },
};
export const ORDEN_ESTADOS = Object.keys(ESTADOS) as EstadoPieza[];

/** Estados de tratamiento que llevan "Indicado / Realizado". */
export const conSituacion = (e: EstadoPieza) => ESTADOS[e].tratable && !ESTADOS[e].siemprePendiente;

export function esPendiente(p: Pick<PiezaDental, "estado" | "situacion">): boolean {
  if (ESTADOS[p.estado].siemprePendiente) return true;
  return conSituacion(p.estado) && p.situacion !== "realizado";
}
export const esTratada = (p: Pick<PiezaDental, "estado" | "situacion">) => conSituacion(p.estado) && p.situacion === "realizado";

/** Resumen para la tarjeta: pendientes, tratadas, sanas (las ausentes no cuentan como sanas). */
export function resumenOdontograma(piezas: Pick<PiezaDental, "pieza_fdi" | "estado" | "situacion">[], denticion: Denticion = "adulto") {
  const validas = new Set(todasLasPiezas(denticion));
  const registradas = piezas.filter((p) => validas.has(p.pieza_fdi));
  const pendientes = registradas.filter(esPendiente).length;
  const tratadas = registradas.filter(esTratada).length;
  const ausentes = registradas.filter((p) => p.estado === "ausente").length;
  const sanas = validas.size - pendientes - tratadas - ausentes;
  return { pendientes, tratadas, sanas, ausentes, total: validas.size };
}

/** Qué estado de catálogo cubre cada estado de pieza pendiente. Una resina indicada se cotiza como el servicio de caries. */
const CLAVE_SERVICIO: Partial<Record<EstadoPieza, string>> = {
  caries: "caries",
  resina: "caries",
  extraccion: "extraccion",
  endodoncia: "endodoncia",
  corona: "corona",
  implante: "implante",
};

export interface ResultadoCotizacion {
  items: ItemCotizacion[];
  /** Piezas pendientes sin servicio en el catálogo: el odontólogo debe agregarlas a mano. */
  sinServicio: { pieza_fdi: number; estado: EstadoPieza }[];
}

/** Arma los renglones de cotización con las piezas pendientes y los precios del catálogo. */
export function cotizarDesdeOdontograma(piezas: PiezaDental[], servicios: Servicio[]): ResultadoCotizacion {
  const items: ItemCotizacion[] = [];
  const sinServicio: ResultadoCotizacion["sinServicio"] = [];
  const pendientes = piezas.filter(esPendiente).sort((a, b) => a.pieza_fdi - b.pieza_fdi);
  for (const p of pendientes) {
    const clave = CLAVE_SERVICIO[p.estado];
    const s = servicios.find((x) => x.activo && x.estado_odontograma === clave);
    if (!s) {
      sinServicio.push({ pieza_fdi: p.pieza_fdi, estado: p.estado });
      continue;
    }
    items.push({ nombre: `${s.nombre} · pieza ${p.pieza_fdi}`, precio: Number(s.precio), cantidad: 1, servicio_id: s.id, pieza_fdi: p.pieza_fdi });
  }
  return { items, sinServicio };
}

/** Texto para la agenda: "Endodoncia · pieza 36". */
export function textoTratamiento(estado: EstadoPieza, pieza: number, situacion?: Situacion | null): string {
  const base = estado === "caries" ? "Resina" : estado === "extraccion" ? "Extracción" : ESTADOS[estado].nombre;
  return `${base} · pieza ${pieza}${situacion === "realizado" ? " (control)" : ""}`;
}
