"use client";
import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Paperclip, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RD } from "@/lib/dinero";
import { fechaCorta, isoDia } from "@/lib/fechas";
import { CATEGORIAS, METODOS } from "@/lib/esquemas";
import type { Movimiento, Paciente } from "@/tipos";
import { Dialogo } from "@/components/ui/dialogo";
import { Aviso, BotonEnviar, Campo, Selector } from "@/components/ui/formulario";
import { avisar, ejecutar } from "@/components/ui/avisos";
import { eliminarMovimiento, guardarMovimiento } from "./acciones";

type Valores = Partial<Movimiento> & { tipo: Movimiento["tipo"] };

export function CajaCliente({ movimientos, pacientes, saldos, inicial }: {
  movimientos: Movimiento[];
  pacientes: Paciente[];
  saldos: Record<string, number>;
  inicial: Valores | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Valores | null>(inicial);
  const pac = new Map(pacientes.map((p) => [p.id, p.nombre]));
  const cerrar = useCallback((v: boolean) => { if (!v) { setForm(null); if (inicial) router.replace("/caja", { scroll: false }); } }, [inicial, router]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setForm({ tipo: "ingreso" })} className="flex h-11 items-center gap-2 rounded-chip bg-lime px-5 text-sm font-semibold text-on-lime transition hover:-translate-y-0.5"><Plus className="size-4" /> Cobro</button>
        <button onClick={() => setForm({ tipo: "egreso" })} className="flex h-11 items-center gap-2 rounded-chip bg-raised px-5 text-sm font-semibold transition hover:-translate-y-0.5"><Plus className="size-4" /> Pago o gasto</button>
      </div>

      <section className="card flex flex-col gap-1.5" aria-label="Movimientos del mes">
        {movimientos.length === 0 ? (
          <div className="grid place-items-center gap-2 py-14 text-center">
            <p className="text-lg font-semibold">No hay movimientos en este mes</p>
            <p className="text-sm text-muted">Registra el primero con «Cobro» o «Pago o gasto».</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {movimientos.map((m, i) => (
              <motion.button
                key={m.id}
                layout
                onClick={() => setForm(m)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.025 }}
                className="flex w-full items-center gap-3 rounded-tile p-3 text-left transition hover:bg-raised"
              >
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", m.tipo === "ingreso" ? "bg-lime/15 text-lime" : "bg-coral/15 text-coral")}>
                  {m.tipo === "ingreso" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 truncate font-semibold">
                    {m.concepto}
                    {m.comprobante_path && <Paperclip className="size-3.5 shrink-0 text-muted" aria-label="Con comprobante" />}
                    {m.es_ejemplo && <span className="rounded-chip border border-dashed border-warn/60 px-1.5 text-[0.6rem] font-normal text-warn">ejemplo</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">{fechaCorta(m.fecha)} · {m.categoria} · {m.metodo}{m.paciente_id ? ` · ${pac.get(m.paciente_id) ?? ""}` : ""}</span>
                </span>
                <span className={cn("shrink-0 font-bold tabular-nums", m.tipo === "ingreso" ? "text-lime" : "text-coral")}>{m.tipo === "ingreso" ? "+" : "−"}{RD(m.monto)}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </section>

      <FormularioMovimiento valores={form} onCambio={cerrar} pacientes={pacientes} saldos={saldos} />
    </>
  );
}

function FormularioMovimiento({ valores, onCambio, pacientes, saldos }: { valores: Valores | null; onCambio: (v: boolean) => void; pacientes: Paciente[]; saldos: Record<string, number> }) {
  const [estado, accion] = useActionState(guardarMovimiento, undefined);
  const [tipo, setTipo] = useState<Movimiento["tipo"]>(valores?.tipo ?? "ingreso");
  const [paciente, setPaciente] = useState(valores?.paciente_id ?? "");
  const [previos, setPrevios] = useState(valores);
  if (valores !== previos) { setPrevios(valores); if (valores) { setTipo(valores.tipo); setPaciente(valores.paciente_id ?? ""); } }
  useEffect(() => { if (estado?.ok) { avisar(estado.ok); onCambio(false); } }, [estado, onCambio]);
  const v = valores ?? { tipo: "ingreso" as const };
  const saldo = paciente ? saldos[paciente] ?? 0 : null;

  return (
    <Dialogo abierto={Boolean(valores)} onCambio={onCambio} titulo={v.id ? "Editar movimiento" : tipo === "ingreso" ? "Registrar cobro" : "Registrar pago o gasto"} ancho="max-w-xl">
      <form key={v.id ?? `nuevo-${v.tipo}`} action={accion} className="grid gap-4 sm:grid-cols-2" noValidate>
        <input type="hidden" name="id" value={v.id ?? ""} />
        <div className="inline-flex rounded-chip bg-sunken p-1 sm:col-span-2" role="radiogroup" aria-label="Tipo">
          {(["ingreso", "egreso"] as const).map((t) => (
            <label key={t} className={cn("flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-chip text-sm font-semibold transition", tipo === t ? (t === "ingreso" ? "bg-lime text-on-lime" : "bg-coral text-[#1c1c1e]") : "text-muted")}>
              <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
              {t === "ingreso" ? "Ingreso (cobro)" : "Egreso (pago)"}
            </label>
          ))}
        </div>
        <Campo etiqueta="Concepto" name="concepto" defaultValue={v.concepto ?? ""} placeholder={tipo === "ingreso" ? "Ej.: Abono brackets" : "Ej.: Botellón de agua"} className="sm:col-span-2" required />
        <Campo etiqueta="Monto (RD$)" name="monto" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={v.monto ?? (saldo && saldo > 0 && tipo === "ingreso" ? saldo : "")} required />
        <Campo etiqueta="Fecha" name="fecha" type="date" defaultValue={v.fecha ?? isoDia()} required />
        <Selector etiqueta="Categoría" name="categoria" key={tipo} defaultValue={v.categoria ?? CATEGORIAS[tipo][tipo === "ingreso" ? 2 : 0]}>
          {CATEGORIAS[tipo].map((c) => <option key={c}>{c}</option>)}
        </Selector>
        <Selector etiqueta="Método" name="metodo" defaultValue={v.metodo ?? "Efectivo"}>
          {METODOS.map((c) => <option key={c}>{c}</option>)}
        </Selector>
        <Selector etiqueta="Paciente (opcional)" name="paciente_id" value={paciente} onChange={(e) => setPaciente(e.target.value)} className="sm:col-span-2">
          <option value="">— Ninguno —</option>
          {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Selector>
        {saldo !== null && <p className="text-sm text-muted sm:col-span-2">Saldo pendiente de este paciente: <b className={saldo > 0 ? "text-coral" : "text-ok"}>{RD(saldo)}</b></p>}
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-tile border-2 border-dashed border-hairline px-4 text-sm text-muted transition hover:border-lime sm:col-span-2">
          <Paperclip className="size-4" />
          <span className="flex-1">{v.comprobante_path ? "Reemplazar comprobante (foto o PDF)" : "Adjuntar comprobante (opcional)"}</span>
          <input type="file" name="comprobante" accept="image/jpeg,image/png,image/webp,application/pdf" className="max-w-40 text-xs file:hidden" />
        </label>
        {v.id && v.comprobante_path && <a href={`/api/comprobantes/${v.id}`} target="_blank" rel="noopener" className="text-sm text-lime underline underline-offset-4 sm:col-span-2">Ver comprobante actual</a>}
        <div className="sm:col-span-2"><Aviso error={estado?.error} /></div>
        <div className="flex gap-2 sm:col-span-2">
          {v.id && (
            <button type="button" onClick={() => ejecutar(async () => { const r = await eliminarMovimiento(v.id!); if (!r?.error) onCambio(false); return r; })} className="flex h-12 items-center gap-2 rounded-chip px-4 text-sm font-semibold text-danger hover:bg-danger/10">
              <Trash2 className="size-4" /> Eliminar
            </button>
          )}
          <BotonEnviar className="h-12 flex-1">Guardar</BotonEnviar>
        </div>
      </form>
    </Dialogo>
  );
}
