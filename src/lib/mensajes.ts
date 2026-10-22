/** Textos de WhatsApp: recordatorios y cotizaciones. */
import { fechaCorta, fechaLarga, hora12 } from "@/lib/fechas";
import { RD } from "@/lib/dinero";
import type { Cita, Clinica, Cotizacion, Doctor, Paciente } from "@/tipos";

/** Plantillas por defecto. Variables: {nombre} {fecha} {hora} {doctor} {clinica} {direccion} {tratamiento} {dias} */
export const TEXTOS_POR_DEFECTO = {
  previo:
    "Hola {nombre}, le recordamos que en {dias}, el {fecha} a las {hora}, tiene su cita de {tratamiento} con {doctor} en {clinica} ({direccion}).\n\nSi desea aplazarla, responda este mensaje y le buscamos otro horario.",
  hoy:
    "Hola {nombre}, le recordamos que HOY tiene su cita de {tratamiento} a las {hora} con {doctor} en {clinica}.\n\nSi necesita aplazarla, responda este mensaje y le buscamos otro horario. ¡Le esperamos!",
};

export function mensajeRecordatorio(tipo: "previo" | "hoy", dias: number, c: Cita, p: Paciente | undefined, d: Doctor | undefined, cl: Clinica): string {
  const plantilla = cl.textos_recordatorio?.[tipo]?.trim() || TEXTOS_POR_DEFECTO[tipo];
  const vars: Record<string, string> = {
    nombre: (p?.nombre ?? "").split(" ")[0] ?? "",
    fecha: fechaLarga(c.fecha),
    hora: hora12(c.hora),
    doctor: d?.nombre ?? "su odontólogo",
    clinica: cl.nombre,
    direccion: cl.direccion ?? "",
    tratamiento: c.tratamiento ?? "odontología",
    dias: `${dias} ${dias === 1 ? "día" : "días"}`,
  };
  return plantilla.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

/** Enlace wa.me. Números dominicanos de 10 dígitos llevan el 1 delante. */
export function enlaceWhatsApp(telefono: string | null | undefined, texto: string): string | null {
  let n = String(telefono ?? "").replace(/\D/g, "");
  if (!n) return null;
  if (n.length === 10) n = `1${n}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

export const numeroCot = (n: number) => `COT-${String(n).padStart(4, "0")}`;

export function textoCotizacion(q: Cotizacion, p: Paciente | undefined, cl: Clinica): string {
  const lineas = q.items.map((i) => `• ${i.nombre}${i.cantidad > 1 ? ` x${i.cantidad}` : ""}: ${RD(i.precio * i.cantidad)}`).join("\n");
  const sub = q.items.reduce((a, i) => a + i.precio * i.cantidad, 0);
  return `${cl.nombre}\nCotización ${numeroCot(q.numero)} · ${fechaCorta(q.fecha)}\nPaciente: ${p?.nombre ?? ""}\n\n${lineas}\n\nSubtotal: ${RD(sub)}${q.descuento_pct ? `\nDescuento: ${q.descuento_pct}%` : ""}\nTOTAL: ${RD(q.total)}\n\nVálida por 30 días.${q.notas ? `\nNota: ${q.notas}` : ""}`;
}
