"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bot, Mic, Plus, Sparkles, Trash2 } from "lucide-react";
import { RD } from "@/lib/dinero";
import { totalCotizacion } from "@/lib/reglas/saldo";
import { EJEMPLOS_COTIZACION } from "@/lib/ia/asistente";
import type { ItemCotizacion, Paciente, Servicio } from "@/tipos";
import { AreaTexto, Boton, Campo, Selector } from "@/components/ui/formulario";
import { avisar } from "@/components/ui/avisos";
import { asistenteCotizacion, guardarCotizacion } from "./acciones";

export interface Borrador {
  id?: string;
  paciente_id: string;
  items: ItemCotizacion[];
  descuento_pct: number;
  notas: string;
  origen: "manual" | "ia" | "odontograma";
}

export function EditorCotizacion({ inicial, pacientes, servicios }: { inicial: Borrador; pacientes: Paciente[]; servicios: Servicio[] }) {
  const router = useRouter();
  const [q, setQ] = useState(inicial);
  const [texto, setTexto] = useState("");
  const [respuesta, setRespuesta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pensando, iniciarIA] = useTransition();
  const [guardando, iniciar] = useTransition();
  const total = totalCotizacion(q.items, q.descuento_pct);
  const subtotal = q.items.reduce((a, i) => a + i.precio * i.cantidad, 0);

  const preguntar = (t: string) => {
    setTexto(t);
    iniciarIA(async () => {
      const r = await asistenteCotizacion(t);
      setRespuesta(r.respuesta);
      if (r.items.length) setQ((x) => ({ ...x, items: r.items, descuento_pct: r.descuento_pct || x.descuento_pct, origen: "ia" }));
    });
  };
  const cambiarItem = (k: number, campo: "precio" | "cantidad", v: number) => setQ((x) => ({ ...x, items: x.items.map((i, j) => (j === k ? { ...i, [campo]: v } : i)) }));
  const guardar = () => iniciar(async () => {
    setError(null);
    const r = await guardarCotizacion(q);
    if (r.error) { setError(r.error); return; }
    avisar(r.ok ?? "Guardada");
    router.push(`/cotizaciones/${r.id}`);
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-5">
        <section className="card flex flex-col gap-4">
          <Selector etiqueta="Paciente" value={q.paciente_id} onChange={(e) => setQ((x) => ({ ...x, paciente_id: e.target.value }))}>
            <option value="">Elegir paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Selector>

          {/* Asistente */}
          <div className="flex flex-col gap-3 rounded-card bg-royal p-4 text-on-royal">
            <p className="flex items-center gap-2 text-sm font-semibold"><Bot className="size-4" /> Asistente de cotización <span className="rounded-chip bg-white/15 px-2 py-0.5 text-[0.65rem] font-normal">modo de prueba</span></p>
            <div className="flex flex-wrap gap-1.5">
              {EJEMPLOS_COTIZACION.map((e) => (
                <button key={e} type="button" onClick={() => preguntar(e)} className="rounded-chip bg-white/12 px-3 py-1.5 text-xs transition hover:bg-lime hover:text-on-lime">{e}</button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (texto.trim()) preguntar(texto); }} className="flex gap-2">
              <label className="sr-only" htmlFor="pedido">¿Qué necesita el paciente?</label>
              <input id="pedido" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe o dicta: «limpieza y 2 resinas con 10%»" className="h-12 min-w-0 flex-1 rounded-chip bg-white/12 px-4 text-sm text-white outline-none placeholder:text-white/55 focus:ring-2 focus:ring-lime" />
              <span className="hidden h-12 items-center text-white/60 sm:flex" title="Usa el micrófono del teclado para dictar"><Mic className="size-4" /></span>
              <button disabled={pensando} className="flex h-12 items-center gap-2 rounded-chip bg-lime px-4 text-sm font-semibold text-on-lime transition hover:-translate-y-0.5 disabled:opacity-60">
                <Sparkles className={pensando ? "size-4 animate-spin" : "size-4"} /> Armar
              </button>
            </form>
            <AnimatePresence>{respuesta && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-tile bg-night/50 px-3 py-2 text-sm">{respuesta}</motion.p>}</AnimatePresence>
          </div>
        </section>

        <section className="card flex flex-col gap-3" aria-label="Servicios">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Servicios</h3>
            {q.origen === "odontograma" && <span className="rounded-chip bg-lime/15 px-3 py-1 text-xs text-lime">Desde el odontograma · revisa los precios</span>}
          </div>
          <AnimatePresence initial={false}>
            {q.items.map((i, k) => (
              <motion.div key={`${i.nombre}-${k}`} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-tile bg-raised p-3 sm:grid-cols-[1fr_90px_130px_120px_auto]">
                <p className="col-span-2 text-sm font-semibold sm:col-span-1">{i.nombre}</p>
                <label className="flex items-center gap-2 text-xs text-muted">Cant.<input type="number" min={1} value={i.cantidad} onChange={(e) => cambiarItem(k, "cantidad", Math.max(1, Number(e.target.value)))} className="h-10 w-16 rounded-tile bg-sunken px-2 text-sm text-ink" /></label>
                <label className="flex items-center gap-2 text-xs text-muted">RD$<input type="number" min={0} value={i.precio} onChange={(e) => cambiarItem(k, "precio", Math.max(0, Number(e.target.value)))} className="h-10 w-24 rounded-tile bg-sunken px-2 text-sm text-ink" /></label>
                <p className="text-right text-sm font-bold tabular-nums">{RD(i.precio * i.cantidad)}</p>
                <button type="button" onClick={() => setQ((x) => ({ ...x, items: x.items.filter((_, j) => j !== k) }))} aria-label={`Quitar ${i.nombre}`} className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger"><Trash2 className="size-4" /></button>
              </motion.div>
            ))}
          </AnimatePresence>
          {!q.items.length && <p className="rounded-tile border-2 border-dashed border-hairline p-6 text-center text-sm text-muted">Usa el asistente o agrega servicios del catálogo.</p>}
          <label className="flex h-12 items-center gap-2 rounded-tile border-2 border-dashed border-lime/40 px-4 text-sm text-muted transition focus-within:border-lime hover:border-lime">
            <Plus className="size-4" />
            <span className="sr-only">Agregar servicio del catálogo</span>
            <select value="" onChange={(e) => { const s = servicios.find((x) => x.id === e.target.value); if (s) setQ((x) => ({ ...x, items: [...x.items, { nombre: s.nombre, precio: s.precio, cantidad: 1, servicio_id: s.id }] })); }} className="h-full flex-1 bg-transparent text-ink outline-none">
              <option value="">Agregar servicio del catálogo…</option>
              {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {RD(s.precio)}</option>)}
            </select>
          </label>
        </section>
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
        <section className="card flex flex-col gap-4">
          <Campo etiqueta="Descuento (%)" type="number" min={0} max={100} value={q.descuento_pct} onChange={(e) => setQ((x) => ({ ...x, descuento_pct: Math.min(100, Math.max(0, Number(e.target.value))) }))} />
          <AreaTexto etiqueta="Notas" value={q.notas} onChange={(e) => setQ((x) => ({ ...x, notas: e.target.value }))} placeholder="Ej.: plan de pago en 3 cuotas" />
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd className="tabular-nums">{RD(subtotal)}</dd></div>
            {q.descuento_pct > 0 && <div className="flex justify-between text-muted"><dt>Descuento {q.descuento_pct}%</dt><dd className="tabular-nums">−{RD(subtotal - total)}</dd></div>}
            <div className="flex items-baseline justify-between pt-2"><dt className="font-semibold">Total</dt><dd className="text-3xl font-bold tabular-nums text-lime">{RD(total)}</dd></div>
          </dl>
          {error && <p role="alert" className="rounded-tile bg-danger/12 px-4 py-3 text-sm text-danger">{error}</p>}
          <Boton onClick={guardar} cargando={guardando} className="h-12">{q.id ? "Guardar cambios" : "Guardar cotización"}</Boton>
        </section>
      </aside>
    </div>
  );
}
