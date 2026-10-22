import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServidor } from "@/lib/supabase/server";

/**
 * Destino de los enlaces de correo (invitación y recuperación).
 * Plantilla de Supabase: {{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=invite&siguiente=/cuenta/contrasena
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const siguiente = searchParams.get("siguiente") ?? "/resumen";
  const destino = siguiente.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/resumen";

  if (token_hash && type) {
    const sb = await supabaseServidor();
    const { error } = await sb.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(destino, request.url));
  }
  return NextResponse.redirect(new URL("/login?error=enlace", request.url));
}
