import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requerirUsuario } from "@/lib/sesion";
import { leer } from "@/datos/repo";
import { RD } from "@/lib/dinero";
import { fechaLarga, mayuscula } from "@/lib/fechas";
import { enlaceWhatsApp, numeroCot, textoCotizacion } from "@/lib/mensajes";
import { cn } from "@/lib/utils";
import { Aparecer } from "@/components/bona/aparecer";
import { Avatar } from "@/components/bona/avatar";
import { EditorCotizacion } from "../editor";
import { ESTADO_COT } from "@/lib/estados";
import { AccionesCotizacion } from "./acciones-detalle";

export const metadata: Metadata = { title: "Cotización" };

export default async function DetalleCotizacion({ params, searchParams }: PageProps<"/cotizaciones/[id]">) {
  const u = await requerirUsuario();
  const { id } = await params;
  const sp = await searchParams;
  const d = await leer();
  const q = d.cotizaciones.find((x) => x.id === id);
  if (!q) notFound();
  const p = d.pacientes.find((x) => x.id === q.paciente_id);

  if (sp.editar && q.estado !== "aprobada") {
    return (
      <>
        <Link href={`/cotizaciones/${id}`} className="flex items-center gap-2 self-start text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Volver</Link>
        <h2 className="text-2xl font-bold tracking-tight">Editar {numeroCot(q.numero)}</h2>
        <EditorCotizacion
          inicial={{ id: q.id, paciente_id: q.paciente_id, items: q.items, descuento_pct: q.descuento_pct, notas: q.notas ?? "", origen: q.origen ?? "manual" }}
          pacientes={d.pacientes}
          servicios={d.servicios.filter((s) => s.activo)}
        />
      </>
    );
  }

  const texto = textoCotizacion(q, p, d.clinica);
  const subtotal = q.items.reduce((a, i) => a + i.precio * i.cantidad, 0);

  return (
    <>
      <Link href="/cotizaciones" className="flex items-center gap-2 self-start text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Cotizaciones</Link>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Aparecer className="card flex min-w-0 flex-col gap-5 sm:p-7">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">{d.clinica.nombre}</p>
              <h2 className="text-3xl font-bold tracking-tight tabular-nums">{numeroCot(q.numero)}</h2>
              <p className="text-sm text-muted">{mayuscula(fechaLarga(q.fecha))} · válida por 30 días</p>
            </div>
            <span className={cn("rounded-chip px-3 py-1.5 text-sm font-semibold", ESTADO_COT[q.estado].clase)}>{ESTADO_COT[q.estado].texto}</span>
          </header>
          {q.origen === "odontograma" && q.estado === "borrador" && (
            <p className="rounded-tile bg-lime/12 px-4 py-3 text-sm text-lime">Se armó desde el odontograma con los precios del catálogo. Revísala antes de enviarla.</p>
          )}
          <Link href={`/pacientes/${q.paciente_id}?tab=cuenta`} className="flex items-center gap-3 self-start rounded-tile bg-raised p-3 pr-5 transition hover:-translate-y-0.5">
            <Avatar nombre={p?.nombre ?? "Paciente"} className="size-11" />
            <span><span className="block font-semibold">{p?.nombre}</span><span className="text-sm text-muted">{p?.telefono ?? "Sin WhatsApp"}</span></span>
          </Link>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-medium">Servicio</th><th className="pb-2 text-right font-medium">Cant.</th><th className="hidden pb-2 text-right font-medium sm:table-cell">Precio</th><th className="pb-2 text-right font-medium">Importe</th></tr></thead>
            <tbody>
              {q.items.map((i, k) => (
                <tr key={k} className="border-t border-hairline">
                  <td className="py-3 pr-2">{i.nombre}</td>
                  <td className="py-3 text-right tabular-nums">{i.cantidad}</td>
                  <td className="hidden py-3 text-right tabular-nums text-muted sm:table-cell">{RD(i.precio)}</td>
                  <td className="py-3 text-right font-semibold tabular-nums">{RD(i.precio * i.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd className="tabular-nums">{RD(subtotal)}</dd></div>
            {q.descuento_pct > 0 && <div className="flex justify-between text-muted"><dt>Descuento {q.descuento_pct}%</dt><dd className="tabular-nums">−{RD(subtotal - q.total)}</dd></div>}
            <div className="flex items-baseline justify-between border-t border-hairline pt-2"><dt className="font-semibold">Total</dt><dd className="text-3xl font-bold tabular-nums text-lime">{RD(q.total)}</dd></div>
          </dl>
          {q.notas && <p className="rounded-tile bg-raised p-3 text-sm text-muted">Nota: {q.notas}</p>}
        </Aparecer>
        <Aparecer orden={1} className="card flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
          <h3 className="text-lg font-semibold">Acciones</h3>
          <AccionesCotizacion id={q.id} estado={q.estado} texto={texto} enlace={enlaceWhatsApp(p?.telefono, texto)} puedeBorrar={u.rol !== "odontologo"} />
        </Aparecer>
      </div>
    </>
  );
}
