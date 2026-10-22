import { NextResponse, type NextRequest } from "next/server";
import { leerComoSistema } from "@/datos/repo";
import { verificarN8n, telefonoE164 } from "@/lib/n8n";
import { diferenciaDias, fechaLarga, hora12, isoDia } from "@/lib/fechas";
import { recordatoriosDelDia } from "@/lib/reglas/recordatorios";
import { mensajeRecordatorio } from "@/lib/mensajes";

/**
 * GET /api/n8n/recordatorios
 * Devuelve los recordatorios que deben salir hoy (pendientes y fallidos para reintentar).
 * Lo llama n8n cada día a las 7:45 a. m. con Authorization: Bearer <N8N_TOKEN>.
 */
export async function GET(req: NextRequest) {
  const error = verificarN8n(req);
  if (error) return error;

  const hoy = isoDia();
  const d = await leerComoSistema();
  const pac = new Map(d.pacientes.map((p) => [p.id, p]));
  const doc = new Map(d.doctores.map((x) => [x.id, x]));

  const recordatorios = [];
  const sinTelefono = [];
  for (const { recordatorio: r, cita: c } of recordatoriosDelDia(hoy, d.recordatorios, d.citas)) {
    const p = pac.get(c.paciente_id);
    const dr = c.doctor_id ? doc.get(c.doctor_id) : undefined;
    const telefono = telefonoE164(p?.telefono);
    if (!telefono) { sinTelefono.push({ recordatorioId: r.id, citaId: c.id, nombre: p?.nombre ?? "" }); continue; }
    recordatorios.push({
      recordatorioId: r.id,
      citaId: c.id,
      tipo: r.tipo,
      telefono,
      nombre: (p?.nombre ?? "").split(" ")[0],
      fecha: fechaLarga(c.fecha),
      hora: hora12(c.hora),
      doctor: dr?.nombre ?? "su odontólogo",
      clinica: d.clinica.nombre,
      direccion: d.clinica.direccion ?? "",
      // Texto de respaldo (las plantillas aprobadas de Meta usan las variables de arriba)
      mensaje: mensajeRecordatorio(r.tipo, diferenciaDias(hoy, c.fecha), c, p, dr, d.clinica),
    });
  }
  return NextResponse.json({ fecha: hoy, total: recordatorios.length, recordatorios, sinTelefono });
}
