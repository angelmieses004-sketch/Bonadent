import "server-only";
/**
 * Repositorio de datos. Dos implementaciones con la misma interfaz:
 *  - Supabase (producción): RLS decide qué ve y qué puede cambiar cada rol.
 *  - Memoria (vista previa sin Supabase): datos de ejemplo que viven mientras el servidor esté encendido.
 *    Imita los triggers de Postgres (recordatorios, historial de piezas, auditoría, numeración COT).
 */
import { randomUUID } from "node:crypto";
import { supabaseConfigurado } from "@/lib/env";
import { isoDia, sumarDias } from "@/lib/fechas";
import { generarRecordatorios, esActiva } from "@/lib/reglas/recordatorios";
import { supabaseAdmin, supabaseServidor } from "@/lib/supabase/server";
import type {
  Cita, Clinica, Cotizacion, EntradaAuditoria, EventoPieza, ItemCotizacion, Marcador, Panoramica, PiezaDental,
  Recordatorio, SugerenciaIA, Usuario,
} from "@/tipos";
import { datosDeEjemplo } from "./ejemplo";

export type Datos = ReturnType<typeof datosDeEjemplo>;
interface Archivo { tipo: string; datos: Uint8Array; nombre: string }
interface Almacen extends Datos { auditoria: EntradaAuditoria[]; archivos: Map<string, Archivo> }

/* ======================================================================
   Memoria
   ====================================================================== */
const g = globalThis as unknown as { __bonadent?: Almacen };
function memoria(): Almacen {
  if (!g.__bonadent) g.__bonadent = { ...datosDeEjemplo(isoDia()), auditoria: [], archivos: new Map() };
  return g.__bonadent;
}
/** Solo para la vista previa: vuelve a los datos de ejemplo. */
export function reiniciarMemoria() { g.__bonadent = undefined; }

function auditarMem(u: Pick<Usuario, "nombre">, tabla: string, registro_id: string | null, accion: EntradaAuditoria["accion"]) {
  memoria().auditoria.unshift({ id: randomUUID(), en: new Date().toISOString(), quien: u.nombre, tabla, registro_id, accion });
  memoria().auditoria.length = Math.min(memoria().auditoria.length, 500);
}

/** Igual que el trigger sincronizar_recordatorios. */
function sincronizarMem(nueva: Cita, antes?: Cita) {
  const m = memoria();
  if (esActiva(nueva)) {
    const reprogramar = !antes || antes.fecha !== nueva.fecha || antes.hora !== nueva.hora || !esActiva(antes);
    if (!reprogramar) return;
    m.recordatorios = m.recordatorios.filter((r) => r.cita_id !== nueva.id);
    m.recordatorios.push(...generarRecordatorios(nueva));
  } else {
    for (const r of m.recordatorios) if (r.cita_id === nueva.id && (r.estado === "pendiente" || r.estado === "fallido")) r.estado = "cancelado";
  }
}

/* ======================================================================
   Lectura
   ====================================================================== */
const CLINICA_VACIA: Clinica = {
  nombre: "Clínica Dental", telefono: null, direccion: null, meta_ingresos_mes: 0,
  horario: { lun: ["08:00", "18:00"], mar: ["08:00", "18:00"], mie: ["08:00", "18:00"], jue: ["08:00", "18:00"], vie: ["08:00", "18:00"], sab: ["08:00", "13:00"], dom: null },
  textos_recordatorio: {}, ia_sugerencias: false,
};

const horaCorta = <T extends { hora: string }>(c: T) => ({ ...c, hora: String(c.hora).slice(0, 5) });

/** Todo lo operativo (sin radiografías). Citas en una ventana amplia alrededor de hoy. */
export async function leer(opciones: { desde?: string; hasta?: string } = {}): Promise<Datos> {
  if (!supabaseConfigurado) return memoria();

  const hoy = isoDia();
  const sb = await supabaseServidor();
  const desdeCitas = opciones.desde ?? sumarDias(hoy, -120);
  const hastaCitas = opciones.hasta ?? sumarDias(hoy, 120);
  const desdeCaja = sumarDias(`${hoy.slice(0, 7)}-01`, -400);

  const [clinica, doctores, servicios, pacientes, citas, movimientos, cotizaciones] = await Promise.all([
    sb.from("clinica").select("*").maybeSingle(),
    sb.from("doctores").select("*").order("nombre"),
    sb.from("servicios").select("*").order("nombre"),
    sb.from("pacientes").select("*").order("nombre"),
    sb.from("citas").select("*").gte("fecha", desdeCitas).lte("fecha", hastaCitas),
    sb.from("movimientos_caja").select("*").gte("fecha", desdeCaja).order("fecha", { ascending: false }),
    sb.from("cotizaciones").select("*, items:cotizacion_items(nombre, precio, cantidad, servicio_id, pieza_fdi, orden)").order("numero", { ascending: false }),
  ]);
  const error = [clinica, doctores, servicios, pacientes, citas, movimientos, cotizaciones].find((r) => r.error)?.error;
  if (error) throw new Error(`No se pudieron cargar los datos: ${error.message}`);

  const citasN = (citas.data ?? []).map(horaCorta) as Cita[];
  const ids = citasN.map((c) => c.id);
  const recordatorios = ids.length ? (await sb.from("recordatorios").select("*").in("cita_id", ids)).data ?? [] : [];

  return {
    clinica: { ...CLINICA_VACIA, ...(clinica.data ?? {}) },
    doctores: doctores.data ?? [],
    servicios: (servicios.data ?? []).map((s) => ({ ...s, precio: Number(s.precio) })),
    pacientes: pacientes.data ?? [],
    citas: citasN,
    recordatorios: recordatorios as Recordatorio[],
    movimientos: (movimientos.data ?? []).map((m) => ({ ...m, monto: Number(m.monto) })),
    cotizaciones: (cotizaciones.data ?? []).map((q) => ({
      ...q, total: Number(q.total), descuento_pct: Number(q.descuento_pct),
      items: [...(q.items ?? [])].sort((a: { orden: number }, b: { orden: number }) => a.orden - b.orden).map((i: ItemCotizacion) => ({ ...i, precio: Number(i.precio) })),
    })),
    panoramicas: [], marcadores: [], piezas: [], eventos: [], sugerencias: [],
  };
}

export interface Clinico {
  /** Cuántas panorámicas tiene (lo único que ve recepción). */
  cantidadPanoramicas: number;
  panoramicas: Panoramica[];
  marcadores: Marcador[];
  piezas: PiezaDental[];
  eventos: EventoPieza[];
  sugerencias: SugerenciaIA[];
}

/** Datos clínicos de un paciente. Recepción recibe solo el conteo de panorámicas. */
export async function leerClinico(pacienteId: string, u: Usuario): Promise<Clinico> {
  const veImagenes = u.rol !== "recepcion";
  if (!supabaseConfigurado) {
    const m = memoria();
    const panoramicas = m.panoramicas.filter((p) => p.paciente_id === pacienteId).sort((a, b) => b.tomada_en.localeCompare(a.tomada_en));
    const ids = new Set(panoramicas.map((p) => p.id));
    return {
      cantidadPanoramicas: panoramicas.length,
      panoramicas: veImagenes ? panoramicas : [],
      marcadores: veImagenes ? m.marcadores.filter((k) => ids.has(k.panoramica_id)) : [],
      piezas: m.piezas.filter((p) => p.paciente_id === pacienteId),
      eventos: m.eventos.filter((e) => e.paciente_id === pacienteId).sort((a, b) => b.creado_en.localeCompare(a.creado_en)),
      sugerencias: veImagenes ? m.sugerencias.filter((s) => ids.has(s.panoramica_id)) : [],
    };
  }

  const sb = await supabaseServidor();
  const [cuenta, piezas, eventos] = await Promise.all([
    sb.rpc("paciente_tiene_panoramica", { p_paciente: pacienteId }),
    sb.from("odontograma_piezas").select("*").eq("paciente_id", pacienteId),
    sb.from("odontograma_eventos").select("*").eq("paciente_id", pacienteId).order("creado_en", { ascending: false }).limit(300),
  ]);
  const usuarios = [...new Set((eventos.data ?? []).map((e) => e.usuario_id).filter(Boolean))];
  const nombres = usuarios.length ? (await sb.from("perfiles").select("id, nombre").in("id", usuarios)).data ?? [] : [];
  const nombre = new Map(nombres.map((p) => [p.id, p.nombre]));
  const base: Clinico = {
    cantidadPanoramicas: Number(cuenta.data ?? 0),
    panoramicas: [], marcadores: [], sugerencias: [],
    piezas: piezas.data ?? [],
    eventos: (eventos.data ?? []).map((e) => ({ ...e, quien: nombre.get(e.usuario_id) ?? "Sistema" })),
  };
  if (!veImagenes) return base;

  const pans = (await sb.from("panoramicas").select("*").eq("paciente_id", pacienteId).order("tomada_en", { ascending: false })).data ?? [];
  const ids = pans.map((p) => p.id);
  const [marc, sug] = ids.length
    ? await Promise.all([sb.from("marcadores").select("*").in("panoramica_id", ids), sb.from("sugerencias_ia").select("*").in("panoramica_id", ids)])
    : [{ data: [] }, { data: [] }];
  return {
    ...base,
    panoramicas: pans,
    marcadores: (marc.data ?? []).map((k) => ({ ...k, x: Number(k.x), y: Number(k.y) })),
    sugerencias: (sug.data ?? []).map((s) => ({ ...s, x: Number(s.x), y: Number(s.y), radio: Number(s.radio), confianza: Number(s.confianza) })),
  };
}

/** Una panorámica (RLS: recepción no la puede leer). */
export async function leerPanoramica(id: string): Promise<Panoramica | null> {
  if (!supabaseConfigurado) return memoria().panoramicas.find((p) => p.id === id) ?? null;
  const sb = await supabaseServidor();
  const { data } = await sb.from("panoramicas").select("*").eq("id", id).maybeSingle();
  return data;
}

/** Piezas del odontograma de un paciente. */
export async function leerPiezas(pacienteId: string): Promise<PiezaDental[]> {
  if (!supabaseConfigurado) return memoria().piezas.filter((p) => p.paciente_id === pacienteId);
  const sb = await supabaseServidor();
  return (await sb.from("odontograma_piezas").select("*").eq("paciente_id", pacienteId)).data ?? [];
}

export async function leerAuditoria(limite = 40): Promise<EntradaAuditoria[]> {
  if (!supabaseConfigurado) return memoria().auditoria.slice(0, limite);
  const sb = await supabaseServidor();
  const { data } = await sb.from("auditoria").select("id, en, usuario_id, tabla, registro_id, accion").order("en", { ascending: false }).limit(limite);
  const ids = [...new Set((data ?? []).map((a) => a.usuario_id).filter(Boolean))];
  const perfiles = ids.length ? (await sb.from("perfiles").select("id, nombre").in("id", ids)).data ?? [] : [];
  const nombre = new Map(perfiles.map((p) => [p.id, p.nombre]));
  return (data ?? []).map((a) => ({ ...a, id: String(a.id), quien: nombre.get(a.usuario_id) ?? "Sistema" }));
}

/* ======================================================================
   Escritura genérica
   ====================================================================== */
const TABLAS = {
  doctores: "doctores", servicios: "servicios", pacientes: "pacientes", citas: "citas",
  movimientos: "movimientos_caja", panoramicas: "panoramicas", marcadores: "marcadores", sugerencias: "sugerencias_ia",
} as const;
export type Coleccion = keyof typeof TABLAS;
type Fila = Record<string, unknown>;

export async function crear(col: Coleccion, fila: Fila, u: Usuario): Promise<string> {
  if (!supabaseConfigurado) {
    const id = randomUUID();
    const nueva = { es_ejemplo: false, ...fila, id };
    (memoria()[col] as unknown as Fila[]).push(nueva);
    if (col === "citas") sincronizarMem(nueva as unknown as Cita);
    auditarMem(u, TABLAS[col], id, "crear");
    return id;
  }
  const sb = await supabaseServidor();
  const { data, error } = await sb.from(TABLAS[col]).insert(fila).select("id").single();
  if (error) throw new Error(mensajeError(error));
  return data.id;
}

export async function actualizar(col: Coleccion, id: string, cambios: Fila, u: Usuario): Promise<void> {
  if (!supabaseConfigurado) {
    const lista = memoria()[col] as unknown as Fila[];
    const i = lista.findIndex((x) => x.id === id);
    if (i < 0) throw new Error("No se encontró el registro.");
    const antes = lista[i];
    lista[i] = { ...antes, ...cambios, id };
    if (col === "citas") sincronizarMem(lista[i] as unknown as Cita, antes as unknown as Cita);
    auditarMem(u, TABLAS[col], id, "editar");
    return;
  }
  const sb = await supabaseServidor();
  const { error, count } = await sb.from(TABLAS[col]).update(cambios, { count: "exact" }).eq("id", id);
  if (error) throw new Error(mensajeError(error));
  if (count === 0) throw new Error("No tienes permiso para cambiar este registro.");
}

export async function eliminar(col: Coleccion, id: string, u: Usuario): Promise<void> {
  if (!supabaseConfigurado) {
    const m = memoria();
    (m[col] as unknown as Fila[]) = (m[col] as unknown as Fila[]).filter((x) => x.id !== id);
    if (col === "citas") m.recordatorios = m.recordatorios.filter((r) => r.cita_id !== id);
    if (col === "pacientes") {
      m.citas = m.citas.filter((c) => c.paciente_id !== id);
      m.cotizaciones = m.cotizaciones.filter((q) => q.paciente_id !== id);
    }
    if (col === "panoramicas") {
      m.marcadores = m.marcadores.filter((k) => k.panoramica_id !== id);
      m.sugerencias = m.sugerencias.filter((s) => s.panoramica_id !== id);
    }
    auditarMem(u, TABLAS[col], id, "borrar");
    return;
  }
  const sb = await supabaseServidor();
  const { error, count } = await sb.from(TABLAS[col]).delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error(mensajeError(error));
  if (count === 0) throw new Error("No tienes permiso para borrar este registro.");
}

function mensajeError(e: { code?: string; message: string }): string {
  if (e.code === "42501") return "No tienes permiso para hacer esto.";
  if (e.code === "23503") return "Este registro está en uso por otros datos.";
  if (e.code === "23514") return "Algún dato no es válido.";
  return "No se pudo guardar. Intenta de nuevo.";
}

/* ======================================================================
   Operaciones específicas
   ====================================================================== */
export async function guardarClinica(cambios: Partial<Clinica>, u: Usuario): Promise<void> {
  if (!supabaseConfigurado) {
    const m = memoria();
    m.clinica = { ...m.clinica, ...cambios };
    auditarMem(u, "clinica", "true", "editar");
    return;
  }
  const sb = await supabaseServidor();
  const { error } = await sb.from("clinica").update(cambios).eq("id", true);
  if (error) throw new Error(mensajeError(error));
}

type NuevaCotizacion = Omit<Cotizacion, "id" | "numero" | "es_ejemplo">;

export async function crearCotizacion(q: NuevaCotizacion, u: Usuario): Promise<{ id: string; numero: number }> {
  if (!supabaseConfigurado) {
    const m = memoria();
    const numero = Math.max(0, ...m.cotizaciones.map((x) => x.numero)) + 1;
    const id = randomUUID();
    m.cotizaciones.unshift({ ...q, id, numero, es_ejemplo: false });
    auditarMem(u, "cotizaciones", id, "crear");
    return { id, numero };
  }
  const sb = await supabaseServidor();
  const { items, ...cab } = q;
  const { data, error } = await sb.from("cotizaciones").insert(cab).select("id, numero").single();
  if (error) throw new Error(mensajeError(error));
  if (items.length) {
    const { error: e2 } = await sb.from("cotizacion_items").insert(items.map((i, orden) => ({ ...i, cotizacion_id: data.id, orden })));
    if (e2) throw new Error(mensajeError(e2));
  }
  return data;
}

export async function actualizarCotizacion(id: string, cambios: Partial<NuevaCotizacion>, u: Usuario): Promise<void> {
  if (!supabaseConfigurado) {
    const m = memoria();
    const q = m.cotizaciones.find((x) => x.id === id);
    if (!q) throw new Error("No se encontró la cotización.");
    Object.assign(q, cambios);
    auditarMem(u, "cotizaciones", id, "editar");
    return;
  }
  const sb = await supabaseServidor();
  const { items, ...cab } = cambios;
  if (Object.keys(cab).length) {
    const { error } = await sb.from("cotizaciones").update(cab).eq("id", id);
    if (error) throw new Error(mensajeError(error));
  }
  if (items) {
    await sb.from("cotizacion_items").delete().eq("cotizacion_id", id);
    if (items.length) await sb.from("cotizacion_items").insert(items.map((i, orden) => ({ ...i, cotizacion_id: id, orden })));
  }
}

export async function eliminarCotizacion(id: string, u: Usuario): Promise<void> {
  if (!supabaseConfigurado) {
    const m = memoria();
    m.cotizaciones = m.cotizaciones.filter((q) => q.id !== id);
    auditarMem(u, "cotizaciones", id, "borrar");
    return;
  }
  const sb = await supabaseServidor();
  const { error } = await sb.from("cotizaciones").delete().eq("id", id);
  if (error) throw new Error(mensajeError(error));
}

/** Cambia el estado de una pieza (y deja historial). */
export async function guardarPieza(p: Omit<PiezaDental, "actualizado_en">, u: Usuario): Promise<void> {
  if (!supabaseConfigurado) {
    const m = memoria();
    const ahora = new Date().toISOString();
    m.piezas = m.piezas.filter((x) => !(x.paciente_id === p.paciente_id && x.pieza_fdi === p.pieza_fdi));
    m.piezas.push({ ...p, actualizado_en: ahora });
    m.eventos.unshift({ id: randomUUID(), ...p, quien: u.nombre, creado_en: ahora });
    auditarMem(u, "odontograma_piezas", `${p.paciente_id}:${p.pieza_fdi}`, "editar");
    return;
  }
  const sb = await supabaseServidor();
  const { error } = await sb.from("odontograma_piezas").upsert({ ...p, actualizado_en: new Date().toISOString() });
  if (error) throw new Error(mensajeError(error));
}

/** Marca un recordatorio. Con `sistema` se usa la clave de servicio (llamadas de n8n, sin sesión). */
export async function marcarRecordatorio(id: string, estado: "enviado" | "fallido" | "pendiente", canal: "bot" | "manual", error: string | null, u: Usuario | "sistema"): Promise<void> {
  const cambios = { estado, canal, ultimo_error: error, enviado_en: estado === "enviado" ? new Date().toISOString() : null };
  if (!supabaseConfigurado) {
    const r = memoria().recordatorios.find((x) => x.id === id);
    if (!r) throw new Error("No se encontró el recordatorio.");
    Object.assign(r, cambios);
    auditarMem(u === "sistema" ? { nombre: "Bot de WhatsApp" } : u, "recordatorios", id, "editar");
    return;
  }
  const sb = u === "sistema" ? supabaseAdmin() : await supabaseServidor();
  const { data: actual } = await sb.from("recordatorios").select("intentos").eq("id", id).single();
  const { error: e } = await sb.from("recordatorios").update({ ...cambios, intentos: (actual?.intentos ?? 0) + (estado === "fallido" ? 1 : 0) }).eq("id", id);
  if (e) throw new Error(mensajeError(e));
}

/** Lectura sin sesión para los endpoints de n8n (clave de servicio). */
export async function leerComoSistema(): Promise<Datos> {
  if (!supabaseConfigurado) return memoria();
  const sb = supabaseAdmin();
  const hoy = isoDia();
  const [clinica, doctores, pacientes, citas] = await Promise.all([
    sb.from("clinica").select("*").maybeSingle(),
    sb.from("doctores").select("*"),
    sb.from("pacientes").select("id, nombre, telefono"),
    sb.from("citas").select("*").gte("fecha", hoy).lte("fecha", sumarDias(hoy, 30)),
  ]);
  const citasN = (citas.data ?? []).map(horaCorta) as Cita[];
  const ids = citasN.map((c) => c.id);
  const recordatorios = ids.length ? (await sb.from("recordatorios").select("*").in("cita_id", ids)).data ?? [] : [];
  return {
    ...memoriaVacia(),
    clinica: { ...CLINICA_VACIA, ...(clinica.data ?? {}) },
    doctores: doctores.data ?? [], pacientes: (pacientes.data ?? []) as Datos["pacientes"], citas: citasN, recordatorios,
  };
}
function memoriaVacia(): Datos {
  return { clinica: CLINICA_VACIA, doctores: [], servicios: [], pacientes: [], citas: [], recordatorios: [], movimientos: [], cotizaciones: [], panoramicas: [], marcadores: [], piezas: [], eventos: [], sugerencias: [] };
}

/** Actualiza una cita sin sesión (respuestas del bot). */
export async function actualizarCitaComoSistema(id: string, cambios: Partial<Cita>): Promise<void> {
  if (!supabaseConfigurado) return actualizar("citas", id, cambios, { nombre: "Bot de WhatsApp" } as Usuario);
  const { error } = await supabaseAdmin().from("citas").update(cambios).eq("id", id);
  if (error) throw new Error(mensajeError(error));
}

/* ======================================================================
   Archivos privados (panorámicas, comprobantes, logo)
   ====================================================================== */
export type Bucket = "panoramicas" | "comprobantes" | "logos";

export async function subirArchivo(bucket: Bucket, archivo: File): Promise<string> {
  const ext = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : archivo.type === "application/pdf" ? "pdf" : "jpg";
  const ruta = `${new Date().getFullYear()}/${randomUUID()}.${ext}`;
  const datos = new Uint8Array(await archivo.arrayBuffer());
  if (!supabaseConfigurado) {
    memoria().archivos.set(`${bucket}/${ruta}`, { tipo: archivo.type, datos, nombre: archivo.name });
    return ruta;
  }
  const sb = await supabaseServidor();
  const { error } = await sb.storage.from(bucket).upload(ruta, datos, { contentType: archivo.type, upsert: false });
  if (error) throw new Error("No se pudo subir el archivo.");
  return ruta;
}

/** En memoria devuelve el archivo; con Supabase, una URL firmada que vence en `segundos`. */
export async function abrirArchivo(bucket: Bucket, ruta: string, segundos = 120): Promise<{ archivo?: Archivo; url?: string } | null> {
  if (!supabaseConfigurado) {
    const a = memoria().archivos.get(`${bucket}/${ruta}`);
    return a ? { archivo: a } : null;
  }
  const sb = await supabaseServidor();
  const { data } = await sb.storage.from(bucket).createSignedUrl(ruta, segundos);
  return data?.signedUrl ? { url: data.signedUrl } : null;
}

export async function registrarVista(tabla: string, id: string, u: Usuario): Promise<void> {
  if (!supabaseConfigurado) return auditarMem(u, tabla, id, "ver");
  const sb = await supabaseServidor();
  await sb.rpc("registrar_vista", { p_tabla: tabla, p_registro: id });
}

/** Borra todo lo marcado como ejemplo. */
export async function borrarEjemplos(u: Usuario): Promise<number> {
  if (!supabaseConfigurado) {
    const m = memoria();
    let n = 0;
    for (const col of ["pacientes", "citas", "movimientos", "cotizaciones", "servicios", "doctores", "panoramicas"] as const) {
      const lista = m[col] as unknown as Fila[];
      n += lista.filter((x) => x.es_ejemplo).length;
      (m[col] as unknown as Fila[]) = lista.filter((x) => !x.es_ejemplo);
    }
    const citas = new Set(m.citas.map((c) => c.id));
    m.recordatorios = m.recordatorios.filter((r) => citas.has(r.cita_id));
    const pacientes = new Set(m.pacientes.map((p) => p.id));
    m.piezas = m.piezas.filter((p) => pacientes.has(p.paciente_id));
    m.eventos = m.eventos.filter((p) => pacientes.has(p.paciente_id));
    auditarMem(u, "ejemplos", null, "borrar");
    return n;
  }
  const sb = await supabaseServidor();
  let n = 0;
  for (const t of ["movimientos_caja", "cotizaciones", "citas", "panoramicas", "pacientes", "servicios", "doctores"]) {
    const { count } = await sb.from(t).delete({ count: "exact" }).eq("es_ejemplo", true);
    n += count ?? 0;
  }
  return n;
}
