import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { actualizarCitaComoSistema, leerComoSistema } from "@/datos/repo";
import { verificarN8n } from "@/lib/n8n";
import { buscarChoque, horariosLibres } from "@/lib/reglas/agenda";
import { esActiva } from "@/lib/reglas/recordatorios";
import { fechaCorta, hora12, isoDia } from "@/lib/fechas";

/**
 * POST /api/n8n/respuestas  (FASE POSTERIOR · apagado por defecto)
 * Recibe lo que el paciente tocó en WhatsApp. Se activa con N8N_RESPUESTAS_ACTIVAS=true.
 *
 *  { "citaId": "...", "respuesta": "confirmo" }                → la cita pasa a confirmada
 *  { "citaId": "...", "respuesta": "aplazar" }                 → devuelve 3 horarios libres del mismo odontólogo
 *  { "citaId": "...", "respuesta": "aplazar", "eleccion": { "fecha": "2026-10-28", "hora": "10:30" } } → mueve la cita
 */
const esquema = z.object({
  citaId: z.string().min(1),
  respuesta: z.enum(["confirmo", "aplazar"]),
  eleccion: z.object({ fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), hora: z.string().regex(/^\d{2}:\d{2}$/) }).optional(),
});

export async function POST(req: NextRequest) {
  const error = verificarN8n(req);
  if (error) return error;
  if (process.env.N8N_RESPUESTAS_ACTIVAS !== "true") {
    return NextResponse.json({ error: "La recepción de respuestas está preparada pero apagada (N8N_RESPUESTAS_ACTIVAS=true para activarla)." }, { status: 501 });
  }
  const v = esquema.safeParse(await req.json().catch(() => null));
  if (!v.success) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });

  const d = await leerComoSistema();
  const cita = d.citas.find((c) => c.id === v.data.citaId);
  if (!cita || !esActiva(cita)) return NextResponse.json({ error: "La cita no existe o ya no está activa" }, { status: 404 });

  if (v.data.respuesta === "confirmo") {
    await actualizarCitaComoSistema(cita.id, { estado: "confirmada" });
    return NextResponse.json({ ok: true, estado: "confirmada" });
  }

  if (!v.data.eleccion) {
    const libres = horariosLibres(cita, d.citas, d.clinica.horario, isoDia());
    return NextResponse.json({ ok: true, libres: libres.map((l) => ({ ...l, texto: `${fechaCorta(l.fecha)} · ${hora12(l.hora)}` })) });
  }

  const { fecha, hora } = v.data.eleccion;
  if (buscarChoque({ ...cita, fecha, hora }, d.citas)) return NextResponse.json({ error: "Ese horario ya se ocupó, ofrezca otro" }, { status: 409 });
  await actualizarCitaComoSistema(cita.id, { fecha, hora, estado: "aplazada", aplazamientos: (cita.aplazamientos ?? 0) + 1 });
  return NextResponse.json({ ok: true, estado: "aplazada", fecha, hora });
}
