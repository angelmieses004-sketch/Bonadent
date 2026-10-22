import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { marcarRecordatorio } from "@/datos/repo";
import { verificarN8n } from "@/lib/n8n";

const esquema = z.object({
  resultados: z.array(z.object({
    recordatorioId: z.string().min(1),
    estado: z.enum(["enviado", "fallido"]),
    error: z.string().max(500).optional(),
  })).min(1).max(500),
});

/**
 * POST /api/n8n/recordatorios/resultado
 * Body: { "resultados": [{ "recordatorioId": "...", "estado": "enviado" | "fallido", "error": "..." }] }
 */
export async function POST(req: NextRequest) {
  const error = verificarN8n(req);
  if (error) return error;
  const v = esquema.safeParse(await req.json().catch(() => null));
  if (!v.success) return NextResponse.json({ error: "Formato inválido", detalle: v.error.issues[0]?.message }, { status: 400 });

  const fallas: { recordatorioId: string; error: string }[] = [];
  for (const r of v.data.resultados) {
    try {
      await marcarRecordatorio(r.recordatorioId, r.estado, "bot", r.estado === "fallido" ? r.error ?? "Error sin detalle" : null, "sistema");
    } catch (e) {
      fallas.push({ recordatorioId: r.recordatorioId, error: e instanceof Error ? e.message : "Error" });
    }
  }
  return NextResponse.json({ actualizados: v.data.resultados.length - fallas.length, fallas });
}
