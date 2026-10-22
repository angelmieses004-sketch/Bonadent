"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirRol } from "@/lib/sesion";
import { intentar } from "@/lib/accion";
import { actualizar, crear, crearCotizacion, eliminar, guardarPieza, leer, leerPanoramica, leerPiezas, subirArchivo } from "@/datos/repo";
import { cotizarDesdeOdontograma, esPiezaValida, ORDEN_ESTADOS } from "@/lib/reglas/odontograma";
import { totalCotizacion } from "@/lib/reglas/saldo";
import { sugerirZonas } from "@/lib/ia/asistente";
import { posicionPieza } from "@/lib/panoramica-sintetica";
import { isoDia } from "@/lib/fechas";
import { numeroCot } from "@/lib/mensajes";
import type { EstadoForm } from "@/lib/acciones-auth";

const clinicos = () => requerirRol("admin", "odontologo");
const refrescar = (pacienteId: string) => revalidatePath(`/pacientes/${pacienteId}`);
const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAX = 25 * 1024 * 1024;

export async function subirPanoramica(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await clinicos();
  const archivo = fd.get("archivo");
  const pacienteId = String(fd.get("paciente_id") ?? "");
  const fecha = String(fd.get("tomada_en") ?? "");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige la imagen de la panorámica" };
  if (!TIPOS.includes(archivo.type)) return { error: "La imagen debe ser JPG o PNG (exporta la imagen desde el equipo de rayos X)" };
  if (archivo.size > MAX) return { error: "La imagen pesa más de 25 MB" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Elige la fecha en que se tomó" };

  const r = await intentar(async () => {
    const ruta = await subirArchivo("panoramicas", archivo);
    await crear("panoramicas", {
      paciente_id: pacienteId, storage_path: ruta, tipo_mime: archivo.type, tomada_en: fecha,
      doctor_id: String(fd.get("doctor_id") || "") || u.doctorId, nota: String(fd.get("nota") ?? "").trim() || null,
    }, u);
  }, "Panorámica subida");
  refrescar(pacienteId);
  return r;
}

export async function eliminarPanoramica(id: string, pacienteId: string): Promise<EstadoForm> {
  const u = await clinicos();
  const r = await intentar(() => eliminar("panoramicas", id, u), "Panorámica eliminada");
  refrescar(pacienteId);
  return r;
}

const esquemaMarcador = z.object({
  panoramica_id: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  pieza_fdi: z.number().int().refine(esPiezaValida, "Elige una pieza válida"),
  nota: z.string().trim().max(300).nullable(),
});

export async function guardarMarcador(datos: z.input<typeof esquemaMarcador>, pacienteId: string): Promise<EstadoForm> {
  const u = await clinicos();
  const v = esquemaMarcador.safeParse(datos);
  if (!v.success) return { error: v.error.issues[0]?.message };
  const r = await intentar(() => crear("marcadores", { ...v.data, nota: v.data.nota || null }, u), `Marcador en la pieza ${v.data.pieza_fdi}`);
  refrescar(pacienteId);
  return r;
}

export async function eliminarMarcador(id: string, pacienteId: string): Promise<EstadoForm> {
  const u = await clinicos();
  const r = await intentar(() => eliminar("marcadores", id, u), "Marcador eliminado");
  refrescar(pacienteId);
  return r;
}

const esquemaPieza = z.object({
  paciente_id: z.string().min(1),
  pieza_fdi: z.number().int().refine(esPiezaValida),
  estado: z.enum(ORDEN_ESTADOS as [string, ...string[]]),
  situacion: z.enum(["indicado", "realizado"]).nullable(),
  nota: z.string().trim().max(500).nullable(),
});

export async function guardarEstadoPieza(datos: z.input<typeof esquemaPieza>): Promise<EstadoForm> {
  const u = await clinicos();
  const v = esquemaPieza.safeParse(datos);
  if (!v.success) return { error: "Revisa el estado de la pieza" };
  const p = v.data as Parameters<typeof guardarPieza>[0];
  const r = await intentar(() => guardarPieza({ ...p, nota: p.nota || null }, u), `Pieza ${p.pieza_fdi} actualizada`);
  refrescar(p.paciente_id);
  return r;
}

/** Arma una cotización en borrador con las piezas pendientes y los precios del catálogo. */
export async function cotizarOdontograma(pacienteId: string): Promise<EstadoForm & { id?: string }> {
  const u = await clinicos();
  const [piezas, d] = await Promise.all([leerPiezas(pacienteId), leer()]);
  const { items, sinServicio } = cotizarDesdeOdontograma(piezas, d.servicios);
  if (!items.length) return { error: sinServicio.length ? "Las piezas pendientes no tienen servicio en el catálogo. Agrégalo en Ajustes." : "No hay piezas pendientes de tratar." };
  try {
    const { id, numero } = await crearCotizacion({
      paciente_id: pacienteId, fecha: isoDia(), descuento_pct: 0, total: totalCotizacion(items), estado: "borrador", origen: "odontograma",
      notas: sinServicio.length ? `Sin precio en catálogo: pieza(s) ${sinServicio.map((s) => s.pieza_fdi).join(", ")}` : null, items,
    }, u);
    revalidatePath("/cotizaciones");
    return { ok: `${numeroCot(numero)} creada en borrador`, id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear la cotización" };
  }
}

/** IA de prueba: crea sugerencias fijas sobre la panorámica. Nunca cambia el odontograma. */
export async function pedirSugerencias(panoramicaId: string, pacienteId: string): Promise<EstadoForm> {
  const u = await clinicos();
  const d = await leer();
  if (!d.clinica.ia_sugerencias) return { error: "Las sugerencias con IA están apagadas. Actívalas en Ajustes." };
  const pan = await leerPanoramica(panoramicaId);
  if (!pan) return { error: "No se encontró la panorámica" };
  const r = await intentar(async () => {
    for (const s of sugerirZonas(posicionPieza)) await crear("sugerencias", { ...s, panoramica_id: panoramicaId, decision: "pendiente" }, u);
  }, "Listo: 3 zonas para revisar");
  refrescar(pacienteId);
  return r;
}

/** El odontólogo acepta (se aplica a la pieza y queda un marcador) o descarta. */
export async function decidirSugerencia(s: { id: string; panoramica_id: string; x: number; y: number; pieza_fdi: number | null; estado_sugerido: string | null; descripcion: string }, decision: "aceptada" | "descartada", pacienteId: string): Promise<EstadoForm> {
  const u = await clinicos();
  const r = await intentar(async () => {
    await actualizar("sugerencias", s.id, { decision, decidido_por: u.vistaPrevia ? null : u.id, decidido_en: new Date().toISOString() }, u);
    if (decision === "aceptada" && s.pieza_fdi && s.estado_sugerido) {
      const estado = s.estado_sugerido as Parameters<typeof guardarPieza>[0]["estado"];
      await guardarPieza({ paciente_id: pacienteId, pieza_fdi: s.pieza_fdi, estado, situacion: ["caries", "extraccion"].includes(estado) ? null : "indicado", nota: `Confirmado por ${u.nombre} desde sugerencia` }, u);
      await crear("marcadores", { panoramica_id: s.panoramica_id, x: s.x, y: s.y, pieza_fdi: s.pieza_fdi, nota: s.descripcion }, u);
    }
  }, decision === "aceptada" ? "Sugerencia aceptada y aplicada a la pieza" : "Sugerencia descartada");
  refrescar(pacienteId);
  return r;
}
