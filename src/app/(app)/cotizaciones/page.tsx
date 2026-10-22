import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requerirUsuario } from "@/lib/sesion";
import { leer } from "@/datos/repo";
import { RD } from "@/lib/dinero";
import { fechaCorta } from "@/lib/fechas";
import { numeroCot } from "@/lib/mensajes";
import { cn } from "@/lib/utils";
import { Aparecer } from "@/components/bona/aparecer";
import { Avatar } from "@/components/bona/avatar";
import { Pestanas } from "@/components/ui/pestanas";
import { ESTADO_COT } from "@/lib/estados";

export const metadata: Metadata = { title: "Cotizaciones" };


export default async function PaginaCotizaciones({ searchParams }: PageProps<"/cotizaciones">) {
  await requerirUsuario();
  const sp = await searchParams;
  const filtro = (["todas", "borrador", "enviada", "aprobada", "rechazada"] as const).find((x) => x === sp.estado) ?? "todas";
  const d = await leer();
  const pac = new Map(d.pacientes.map((p) => [p.id, p]));
  const lista = d.cotizaciones.filter((q) => filtro === "todas" || q.estado === filtro).sort((a, b) => b.numero - a.numero);
  const cuenta = (e: string) => d.cotizaciones.filter((q) => q.estado === e).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cotizaciones</h2>
          <p className="text-sm text-muted">Al aprobarla, el total pasa al saldo del paciente.</p>
        </div>
        <Pestanas grupo="cot" activo={filtro} items={[
          { valor: "todas", texto: "Todas", href: "/cotizaciones", cuenta: d.cotizaciones.length },
          { valor: "borrador", texto: "Borrador", href: "/cotizaciones?estado=borrador", cuenta: cuenta("borrador") },
          { valor: "enviada", texto: "Enviadas", href: "/cotizaciones?estado=enviada", cuenta: cuenta("enviada") },
          { valor: "aprobada", texto: "Aprobadas", href: "/cotizaciones?estado=aprobada", cuenta: cuenta("aprobada") },
          { valor: "rechazada", texto: "Rechazadas", href: "/cotizaciones?estado=rechazada", cuenta: cuenta("rechazada") },
        ]} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/cotizaciones/nueva" className="group grid min-h-44 place-items-center rounded-card border-2 border-dashed border-lime/50 p-4 text-sm text-muted transition hover:border-lime hover:text-ink">
          <span className="flex flex-col items-center gap-2"><Plus className="size-7 transition-transform duration-300 group-hover:rotate-90" /> Nueva cotización</span>
        </Link>
        {lista.map((q, i) => {
          const p = pac.get(q.paciente_id);
          return (
            <Aparecer key={q.id} orden={Math.min(i, 9)}>
              <Link href={`/cotizaciones/${q.id}`} className={cn("lift group flex h-full min-h-44 flex-col gap-3 rounded-card p-5", i === 0 && filtro === "todas" ? "bg-royal text-on-royal" : "bg-card")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold tabular-nums">{numeroCot(q.numero)}</span>
                  <span className={cn("rounded-chip px-2.5 py-1 text-xs font-semibold", ESTADO_COT[q.estado].clase)}>{ESTADO_COT[q.estado].texto}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Avatar nombre={p?.nombre ?? "Paciente"} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p?.nombre}</p>
                    <p className={cn("truncate text-xs", i === 0 && filtro === "todas" ? "text-white/70" : "text-muted")}>{fechaCorta(q.fecha)} · {q.items.length} servicio{q.items.length === 1 ? "" : "s"}{q.origen === "odontograma" ? " · odontograma" : ""}</p>
                  </div>
                </div>
                <p className={cn("line-clamp-2 text-xs", i === 0 && filtro === "todas" ? "text-white/70" : "text-muted")}>{q.items.map((x) => x.nombre).join(", ")}</p>
                <p className="mt-auto text-2xl font-bold tabular-nums">{RD(q.total)}</p>
              </Link>
            </Aparecer>
          );
        })}
      </div>
    </>
  );
}
