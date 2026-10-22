import { NextResponse, type NextRequest } from "next/server";
import { obtenerUsuario } from "@/lib/sesion";
import { abrirArchivo, leer } from "@/datos/repo";

/** Comprobante de un movimiento de caja (solo admin y recepción). */
export async function GET(_: NextRequest, ctx: RouteContext<"/api/comprobantes/[id]">) {
  const u = await obtenerUsuario();
  if (!u || u.rol === "odontologo") return new NextResponse("Sin permiso", { status: 403 });
  const { id } = await ctx.params;
  const m = (await leer()).movimientos.find((x) => x.id === id);
  if (!m?.comprobante_path) return new NextResponse("Sin comprobante", { status: 404 });
  const a = await abrirArchivo("comprobantes", m.comprobante_path);
  if (!a) return new NextResponse("No encontrado", { status: 404 });
  const privado = { "Cache-Control": "private, no-store" };
  if (a.url) return NextResponse.redirect(a.url, { headers: privado });
  return new NextResponse(Buffer.from(a.archivo!.datos), { headers: { ...privado, "Content-Type": a.archivo!.tipo } });
}
