import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigurado } from "@/lib/env";

/** Token de la vista previa para probar los endpoints sin configurar nada (solo sin Supabase). */
export const TOKEN_VISTA_PREVIA = "vista-previa";

/** n8n debe enviar: Authorization: Bearer <N8N_TOKEN>. Devuelve una respuesta de error o null si pasa. */
export function verificarN8n(req: NextRequest): NextResponse | null {
  const esperado = process.env.N8N_TOKEN || (supabaseConfigurado ? "" : TOKEN_VISTA_PREVIA);
  if (!esperado) return NextResponse.json({ error: "Falta N8N_TOKEN en las variables de entorno" }, { status: 503 });
  const recibido = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recibido), b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  return null;
}

/** "809-555-0111" → "18095550111" (formato que pide la API de WhatsApp). */
export function telefonoE164(t: string | null | undefined): string | null {
  const n = String(t ?? "").replace(/\D/g, "");
  if (n.length === 10) return `1${n}`;
  if (n.length === 11 && n.startsWith("1")) return n;
  return null;
}
