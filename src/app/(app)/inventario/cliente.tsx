"use client";
import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { History, Minus, PackagePlus, Pencil, Plus, Search, SlidersHorizontal, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { coincide } from "@/lib/texto";
import { CATEGORIAS_INVENTARIO, UNIDADES, estadoStock, type EstadoStock } from "@/lib/reglas/inventario";
import type { ArticuloInventario } from "@/tipos";
import { Chips } from "@/components/bona/chips";
import { Dialogo } from "@/components/ui/dialogo";
import { Menu } from "@/components/ui/menu";
import { AreaTexto, Aviso, BotonEnviar, Campo } from "@/components/ui/formulario";
import { avisar, ejecutar } from "@/components/ui/avisos";
import { ajustarExistencia, eliminarArticulo, guardarArticulo, moverExistencia } from "./acciones";

const TONO: Record<EstadoStock, { barra: string; chip: string; texto: string }> = {
  ok: { barra: "bg-lime", chip: "bg-ok/15 text-ok", texto: "Suficiente" },
  bajo: { barra: "bg-warn", chip: "bg-warn/15 text-warn", texto: "Por reponer" },
  agotado: { barra: "bg-danger", chip: "bg-danger/15 text-danger", texto: "Agotado" },
};
const fmt = (n: number) => new Intl.NumberFormat("es-DO", { maximumFractionDigits: 2 }).format(n);

export function InventarioCliente({ articulos, puedeGestionar }: { articulos: ArticuloInventario[]; puedeGestionar: boolean }) {
  const [filtro, setFiltro] = useState("todos");
  const [q, setQ] = useState("");
  const [editando, setEditando] = useState<Partial<ArticuloInventario> | null>(null);
  const [ajustando, setAjustando] = useState<ArticuloInventario | null>(null);

  const categorias = useMemo(() => [...new Set(articulos.map((a) => a.categoria))].sort(), [articulos]);
  const reponer = articulos.filter((a) => estadoStock(a) !== "ok").length;
  const lista = articulos
    .filter((a) => (filtro === "todos" ? true : filtro === "reponer" ? estadoStock(a) !== "ok" : a.categoria === filtro))
    .filter((a) => !q || coincide(`${a.nombre} ${a.categoria} ${a.nota ?? ""}`, q));

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="flex h-12 items-center gap-2 rounded-chip bg-card px-4 text-muted focus-within:ring-2 focus-within:ring-lime md:w-72">
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">Buscar en el inventario</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Buscar: gomitas, enjuague…" className="w-full bg-transparent text-base text-ink outline-none placeholder:text-faint md:text-sm" />
        </label>
        <div className="-mx-3.5 overflow-x-auto px-3.5 [scrollbar-width:none] md:mx-0 md:px-0">
          <Chips
            etiqueta="Filtrar inventario"
            enUnaFila
            valor={filtro}
            onCambio={setFiltro}
            opciones={[
              { valor: "todos", texto: "Todos", cuenta: articulos.length },
              { valor: "reponer", texto: "Por reponer", cuenta: reponer },
              ...categorias.map((c) => ({ valor: c, texto: c })),
            ]}
          />
        </div>
      </div>

      <motion.ul layout className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
        {puedeGestionar && filtro === "todos" && !q && (
          <li>
            <button onClick={() => setEditando({ categoria: "Otros", unidad: "unidades", minimo: 0 })} className="group grid h-full min-h-28 w-full place-items-center rounded-card border-2 border-dashed border-lime/50 p-4 text-sm text-muted transition hover:border-lime hover:text-ink sm:min-h-52">
              <span className="flex flex-col items-center gap-2"><PackagePlus className="size-7 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" /> Agregar artículo</span>
            </button>
          </li>
        )}
        <AnimatePresence initial={false}>
          {lista.map((a, i) => (
            <TarjetaArticulo key={a.id} a={a} i={i} puedeGestionar={puedeGestionar} onEditar={() => setEditando(a)} onAjustar={() => setAjustando(a)} />
          ))}
        </AnimatePresence>
      </motion.ul>
      {lista.length === 0 && (
        <div className="card grid place-items-center gap-2 py-12 text-center">
          <p className="text-lg font-semibold">{filtro === "reponer" ? "No hay nada por reponer" : "No hay artículos con ese filtro"}</p>
          <p className="text-sm text-muted">{filtro === "reponer" ? "Todas las existencias están por encima del mínimo." : "Prueba otra búsqueda."}</p>
        </div>
      )}

      <FormularioArticulo valores={editando} onCerrar={() => setEditando(null)} categorias={categorias} />
      <FormularioAjuste articulo={ajustando} onCerrar={() => setAjustando(null)} />
    </>
  );
}

function TarjetaArticulo({ a, i, puedeGestionar, onEditar, onAjustar }: { a: ArticuloInventario; i: number; puedeGestionar: boolean; onEditar: () => void; onAjustar: () => void }) {
  // Cantidad optimista: cambia al instante y se corrige si el servidor dice otra cosa.
  const [local, setLocal] = useState(a.cantidad);
  const [servidor, setServidor] = useState(a.cantidad);
  if (a.cantidad !== servidor) { setServidor(a.cantidad); setLocal(a.cantidad); }
  const [dir, setDir] = useState(0);
  const [, iniciar] = useTransition();

  const estado = estadoStock({ cantidad: local, minimo: a.minimo });
  const tono = TONO[estado];
  const tope = Math.max(a.minimo * 2, local, 1);

  const mover = (delta: number) => {
    if (local + delta < 0) { avisar("No hay suficientes existencias", "error"); return; }
    setDir(delta);
    setLocal((x) => x + delta);
    iniciar(async () => {
      const r = await moverExistencia(a.id, delta);
      if (r.error) { setLocal((x) => x - delta); avisar(r.error, "error"); }
    });
  };

  const opciones = [
    { texto: "Ajustar cantidad", onSelect: onAjustar, icono: <SlidersHorizontal className="size-4" /> },
    ...(puedeGestionar ? [
      { texto: "Editar artículo", onSelect: onEditar, icono: <Pencil className="size-4" /> },
      { texto: "Eliminar", onSelect: () => confirm(`¿Eliminar «${a.nombre}» del inventario?`) && ejecutar(() => eliminarArticulo(a.id)), peligro: true, icono: <Trash2 className="size-4" /> },
    ] : []),
  ];

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(i, 10) * 0.03, type: "spring", stiffness: 320, damping: 28 }}
      className={cn("card lift flex flex-col gap-2.5 p-3.5 sm:gap-4 sm:p-5", estado === "agotado" && "ring-1 ring-danger/40")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-chip bg-raised px-2.5 py-0.5 text-[0.7rem] text-muted">{a.categoria}</span>
            {estado !== "ok" && (
              <span className={cn("flex items-center gap-1 rounded-chip px-2.5 py-0.5 text-[0.7rem] font-semibold", tono.chip)}>
                <TriangleAlert className="size-3" /> {tono.texto}
              </span>
            )}
            {a.es_ejemplo && <span className="rounded-chip border border-dashed border-warn/60 px-1.5 text-[0.6rem] text-warn">ejemplo</span>}
          </div>
          <h3 className="mt-1 text-base leading-snug font-semibold sm:mt-1.5">{a.nombre}</h3>
          {a.nota && <p className="truncate text-xs text-muted">{a.nota}</p>}
        </div>
        <Menu etiqueta={`Acciones de ${a.nombre}`} opciones={opciones} />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => mover(-1)} disabled={local <= 0} aria-label={`Sacar 1 ${a.unidad} de ${a.nombre}`}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-raised text-ink transition hover:bg-coral hover:text-[#1c1c1e] active:scale-90 disabled:opacity-35 sm:size-12">
          <Minus className="size-5" />
        </button>
        <button onClick={onAjustar} className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5 rounded-tile py-1 transition hover:bg-raised sm:flex-col sm:items-center sm:gap-0" aria-label={`${fmt(local)} ${a.unidad}. Ajustar cantidad`}>
          <span className="relative h-10 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.span
                key={local}
                custom={dir}
                initial={{ y: dir > 0 ? 24 : -24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: dir > 0 ? -24 : 24, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className={cn("block text-[2.4rem] leading-10 font-bold tabular-nums", estado === "agotado" ? "text-danger" : estado === "bajo" ? "text-warn" : "text-ink")}
              >
                {fmt(local)}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="text-xs text-muted">{a.unidad}</span>
        </button>
        <button onClick={() => mover(1)} aria-label={`Agregar 1 ${a.unidad} de ${a.nombre}`}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-lime text-on-lime transition hover:brightness-105 active:scale-90 sm:size-12">
          <Plus className="size-5" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-2 overflow-hidden rounded-chip bg-raised">
          <motion.div className={cn("h-full origin-left rounded-chip", tono.barra)} animate={{ scaleX: Math.min(1, local / tope) }} transition={{ type: "spring", stiffness: 200, damping: 26 }} />
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>Mínimo: {fmt(a.minimo)}</span>
          <Link href={`/inventario?ver=historial&articulo=${a.id}`} className="flex items-center gap-1 hover:text-ink"><History className="size-3" /> Historial</Link>
        </div>
      </div>
    </motion.li>
  );
}

function FormularioArticulo({ valores, onCerrar, categorias }: { valores: Partial<ArticuloInventario> | null; onCerrar: () => void; categorias: string[] }) {
  const [estado, accion] = useActionState(async (prev: Awaited<ReturnType<typeof guardarArticulo>>, fd: FormData) => {
    const r = await guardarArticulo(prev, fd);
    if (r?.ok) { avisar(r.ok); onCerrar(); }
    return r;
  }, undefined);
  const v = valores ?? {};
  const cats = [...new Set([...CATEGORIAS_INVENTARIO, ...categorias])];

  return (
    <Dialogo abierto={Boolean(valores)} onCambio={(x) => !x && onCerrar()} titulo={v.id ? "Editar artículo" : "Nuevo artículo"} descripcion={v.id ? "Para cambiar la cantidad usa «Ajustar cantidad»." : "Ej.: gomitas de ortodoncia, enjuague bucal, guantes…"}>
      <form key={v.id ?? "nuevo"} action={accion} className="grid gap-4 sm:grid-cols-2" noValidate>
        <input type="hidden" name="id" value={v.id ?? ""} />
        <Campo etiqueta="Nombre" name="nombre" defaultValue={v.nombre ?? ""} placeholder="Ej.: Enjuague bucal" required className="sm:col-span-2" />
        <div>
          <Campo etiqueta="Categoría" name="categoria" defaultValue={v.categoria ?? "Otros"} list="cats-inv" required />
          <datalist id="cats-inv">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <Campo etiqueta="Unidad" name="unidad" defaultValue={v.unidad ?? "unidades"} list="unid-inv" required />
          <datalist id="unid-inv">{UNIDADES.map((u) => <option key={u} value={u} />)}</datalist>
        </div>
        {!v.id && <Campo etiqueta="Cantidad que hay ahora" name="cantidad" type="number" min={0} step="any" inputMode="decimal" defaultValue={0} />}
        <Campo etiqueta="Avisarme cuando queden" name="minimo" type="number" min={0} step="any" inputMode="decimal" defaultValue={v.minimo ?? 0} ayuda="Mínimo antes de reponer" />
        <AreaTexto etiqueta="Nota (opcional)" name="nota" defaultValue={v.nota ?? ""} placeholder="Ej.: proveedor, presentación, tamaño" className="sm:col-span-2" />
        <div className="sm:col-span-2"><Aviso error={estado?.error} /></div>
        <BotonEnviar className="h-12 sm:col-span-2">{v.id ? "Guardar cambios" : "Agregar al inventario"}</BotonEnviar>
      </form>
    </Dialogo>
  );
}

const MOTIVOS = { entrada: ["Compra a proveedor", "Donación / muestra", "Devolución"], salida: ["Uso en consulta", "Kit para paciente", "Vencido o dañado"], exacto: ["Conteo físico", "Corrección"] };

function FormularioAjuste({ articulo, onCerrar }: { articulo: ArticuloInventario | null; onCerrar: () => void }) {
  const [modo, setModo] = useState<"entrada" | "salida" | "exacto">("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [previo, setPrevio] = useState<ArticuloInventario | null>(null);
  if (articulo !== previo) { setPrevio(articulo); if (articulo) { setModo("entrada"); setCantidad(""); setMotivo(""); } }
  const [estado, accion] = useActionState(async (prev: Awaited<ReturnType<typeof ajustarExistencia>>, fd: FormData) => {
    const r = await ajustarExistencia(prev, fd);
    if (r?.ok) { avisar(r.ok); onCerrar(); }
    return r;
  }, undefined);

  if (!articulo) return <Dialogo abierto={false} onCambio={() => {}} titulo=""><span /></Dialogo>;
  const n = Number(cantidad) || 0;
  const queda = modo === "entrada" ? articulo.cantidad + n : modo === "salida" ? articulo.cantidad - n : n;

  return (
    <Dialogo abierto onCambio={(x) => !x && onCerrar()} titulo={articulo.nombre} descripcion={`Hay ${fmt(articulo.cantidad)} ${articulo.unidad}`}>
      <form action={accion} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="id" value={articulo.id} />
        <input type="hidden" name="modo" value={modo} />
        <div className="grid grid-cols-3 gap-1 rounded-chip bg-sunken p-1" role="radiogroup" aria-label="Tipo de ajuste">
          {([["entrada", "Poner"], ["salida", "Sacar"], ["exacto", "Contar"]] as const).map(([m, t]) => (
            <button key={m} type="button" role="radio" aria-checked={modo === m} onClick={() => { setModo(m); setMotivo(""); }}
              className={cn("min-h-11 rounded-chip text-sm font-semibold transition", modo === m ? (m === "salida" ? "bg-coral text-[#1c1c1e]" : "bg-lime text-on-lime") : "text-muted")}>
              {t}
            </button>
          ))}
        </div>
        <Campo
          etiqueta={modo === "entrada" ? "¿Cuántas entran?" : modo === "salida" ? "¿Cuántas salen?" : "¿Cuántas hay en total?"}
          name="cantidad" type="number" min={0} step="any" inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} autoFocus required
        />
        {modo !== "exacto" && (
          <div className="flex gap-2">
            {[1, 5, 10, 20].map((k) => (
              <button key={k} type="button" onClick={() => setCantidad(String((Number(cantidad) || 0) + k))} className="h-10 flex-1 rounded-chip bg-raised text-sm font-semibold transition hover:bg-card active:scale-95">+{k}</button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Campo etiqueta="Motivo (opcional)" name="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: compra a proveedor" />
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS[modo].map((m) => (
              <button key={m} type="button" onClick={() => setMotivo(m)} className={cn("rounded-chip px-3 py-1.5 text-xs transition", motivo === m ? "bg-lime text-on-lime" : "bg-raised text-muted hover:text-ink")}>{m}</button>
            ))}
          </div>
        </div>
        <p className={cn("rounded-tile px-4 py-3 text-sm", queda < 0 ? "bg-danger/12 text-danger" : "bg-raised")}>
          {queda < 0 ? "No hay suficientes existencias para sacar esa cantidad." : <>Quedarán <b className="tabular-nums">{fmt(queda)}</b> {articulo.unidad}{articulo.minimo > 0 && queda <= articulo.minimo ? " · por debajo del mínimo" : ""}</>}
        </p>
        <Aviso error={estado?.error} />
        <BotonEnviar className="h-12" disabled={queda < 0 || cantidad === ""}>Guardar</BotonEnviar>
      </form>
    </Dialogo>
  );
}
