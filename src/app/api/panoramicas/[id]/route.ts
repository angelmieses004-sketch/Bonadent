import { NextResponse, type NextRequest } from "next/server";
import { obtenerUsuario } from "@/lib/sesion";
import { abrirArchivo, leerPanoramica, registrarVista } from "@/datos/repo";
import { svgPanoramica } from "@/lib/panoramica-sintetica";

/**
 * Entrega la imagen de una panorámica a quien tenga permiso (admin u odontólogo).
 * Nunca hay URL pública: en producción redirige a una URL firmada de Supabase que vence en 2 minutos.
 * Cada apertura queda en la auditoría.
 */
export async function GET(_: NextRequest, ctx: RouteContext<"/api/panoramicas/[id]">) {
  const u = await obtenerUsuario();
  if (!u) return new NextResponse("Inicia sesión", { status: 401 });
  if (u.rol === "recepcion") return new NextResponse("Recepción no puede ver radiografías", { status: 403 });

  const { id } = await ctx.params;
  const pan = await leerPanoramica(id);
  if (!pan) return new NextResponse("No encontrada", { status: 404 });
  await registrarVista("panoramicas", id, u);

  const privado = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

  if (pan.storage_path.startsWith("ejemplo/")) {
    return new NextResponse(svgPanoramica(pan.storage_path.slice(8)), { headers: { ...privado, "Content-Type": "image/svg+xml" } });
  }
  const a = await abrirArchivo("panoramicas", pan.storage_path);
  if (!a) return new NextResponse("No se encontró el archivo", { status: 404 });
  if (a.url) return NextResponse.redirect(a.url, { headers: privado });
  return new NextResponse(Buffer.from(a.archivo!.datos), { headers: { ...privado, "Content-Type": a.archivo!.tipo } });
}
