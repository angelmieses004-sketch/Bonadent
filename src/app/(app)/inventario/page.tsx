import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal, X } from "lucide-react";
import { requerirUsuario } from "@/lib/sesion";
import { leer, leerMovimientosInventario } from "@/datos/repo";
import { estadoStock, porReponer } from "@/lib/reglas/inventario";
import { fechaCorta, ZONA } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import { Aparecer } from "@/components/bona/aparecer";
import { Contador } from "@/components/bona/contador";
import { Pestanas } from "@/components/ui/pestanas";
import { InventarioCliente } from "./cliente";

export const metadata: Metadata = { title: "Inventario" };

const fmt = (n: number) => new Intl.NumberFormat("es-DO", { maximumFractionDigits: 2, signDisplay: "exceptZero" }).format(n);
const hora = (iso: string) => new Intl.DateTimeFormat("es-DO", { timeZone: ZONA, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export default async function PaginaInventario({ searchParams }: PageProps<"/inventario">) {
  const u = await requerirUsuario();
  const sp = await searchParams;
  const ver = sp.ver === "historial" ? "historial" : "articulos";
  const articuloId = typeof sp.articulo === "string" ? sp.articulo : undefined;
  const d = await leer();
  const articulos = d.articulos.filter((a) => a.activo).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const reponer = porReponer(articulos);
  const agotados = articulos.filter((a) => estadoStock(a) === "agotado").length;
  const nombre = new Map(articulos.map((a) => [a.id, a]));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventario</h2>
          <p className="text-sm text-muted">Toca + o − para poner o sacar. Toca el número para ajustar con motivo.</p>
        </div>
        <Pestanas grupo="inv" activo={ver} items={[
          { valor: "articulos", texto: "Artículos", href: "/inventario", cuenta: articulos.length },
          { valor: "historial", texto: "Historial", href: "/inventario?ver=historial" },
        ]} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[1fr_1fr_2fr]">
        <Aparecer orden={0} className="card lift p-4 sm:p-5">
          <p className="text-sm text-muted">Artículos</p>
          <Contador valor={articulos.length} className="mt-1 block text-3xl font-bold tabular-nums" />
          <p className="text-xs text-faint">{new Set(articulos.map((a) => a.categoria)).size} categorías</p>
        </Aparecer>
        <Aparecer orden={1} className="card lift p-4 sm:p-5">
          <p className="text-sm text-muted">Agotados</p>
          <Contador valor={agotados} className={cn("mt-1 block text-3xl font-bold tabular-nums", agotados ? "text-danger" : "text-ok")} />
          <p className="text-xs text-faint">{agotados ? "Hay que comprar ya" : "Nada agotado"}</p>
        </Aparecer>
        <Aparecer orden={2} className="lift col-span-2 flex flex-col gap-2.5 rounded-card bg-royal p-4 text-on-royal sm:p-5 lg:col-span-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold">Por reponer</p>
            <span className="text-2xl font-bold tabular-nums">{reponer.length}</span>
          </div>
          {reponer.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {reponer.slice(0, 6).map((a) => (
                <li key={a.id} className={cn("rounded-chip px-3 py-1 text-xs font-semibold", estadoStock(a) === "agotado" ? "bg-night text-white" : "bg-white/15")}>
                  {a.nombre} · {a.cantidad}
                </li>
              ))}
              {reponer.length > 6 && <li className="px-2 py-1 text-xs text-white/75">+{reponer.length - 6} más</li>}
            </ul>
          ) : <p className="text-sm text-white/75">Todo está por encima del mínimo.</p>}
        </Aparecer>
      </div>

      {ver === "articulos" ? (
        <InventarioCliente articulos={articulos} puedeGestionar={u.rol !== "odontologo"} />
      ) : (
        <Historial articuloId={articuloId} nombre={nombre} />
      )}
    </>
  );
}

async function Historial({ articuloId, nombre }: { articuloId?: string; nombre: Map<string, { nombre: string; unidad: string }> }) {
  const movs = await leerMovimientosInventario(100, articuloId);
  return (
    <Aparecer className="card flex flex-col gap-2">
      {articuloId && (
        <Link href="/inventario?ver=historial" className="flex items-center gap-2 self-start rounded-chip bg-lime px-3 py-1.5 text-sm font-semibold text-on-lime">
          {nombre.get(articuloId)?.nombre ?? "Artículo"} <X className="size-3.5" />
        </Link>
      )}
      {movs.length ? movs.map((m) => {
        const a = nombre.get(m.articulo_id);
        const Icono = m.tipo === "ajuste" ? SlidersHorizontal : m.cantidad >= 0 ? ArrowDownLeft : ArrowUpRight;
        return (
          <div key={m.id} className="flex items-center gap-3 rounded-tile bg-raised p-3">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", m.tipo === "ajuste" ? "bg-info/15 text-info" : m.cantidad >= 0 ? "bg-lime/15 text-lime" : "bg-coral/15 text-coral")}>
              <Icono className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{a?.nombre ?? "Artículo eliminado"}</p>
              <p className="truncate text-xs text-muted">{fechaCorta(m.creado_en.slice(0, 10))} · {hora(m.creado_en)} · {m.quien}{m.motivo ? ` · ${m.motivo}` : ""}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("font-bold tabular-nums", m.cantidad >= 0 ? "text-lime" : "text-coral")}>{fmt(m.cantidad)}</p>
              <p className="text-xs tabular-nums text-faint">quedan {m.resultante}</p>
            </div>
          </div>
        );
      }) : <p className="py-10 text-center text-sm text-muted">Todavía no hay movimientos.</p>}
    </Aparecer>
  );
}
