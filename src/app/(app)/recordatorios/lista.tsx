"use client";
import { useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { BellRing, Check, Copy, MessageCircle, RotateCcw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { avisar, ejecutar } from "@/components/ui/avisos";
import { Avatar } from "@/components/bona/avatar";
import { marcarEnviadoManual, volverAPendiente } from "./acciones";

export interface FilaRecordatorio {
  id: string;
  tipo: "previo" | "hoy";
  estado: string;
  canal: string | null;
  error: string | null;
  atrasado: boolean;
  paciente: string;
  telefono: string | null;
  cuando: string;
  doctor: string;
  mensaje: string;
  enlace: string | null;
  fechaCita: string;
}

export function ListaRecordatorios({ filas, puedeEnviar, vacio }: { filas: FilaRecordatorio[]; puedeEnviar: boolean; vacio: string }) {
  if (!filas.length) {
    return (
      <div className="card grid place-items-center gap-2 py-14 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-lime text-on-lime"><Check className="size-6" /></span>
        <p className="text-lg font-semibold">{vacio}</p>
      </div>
    );
  }
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      <AnimatePresence initial={false}>
        {filas.map((f, i) => <Item key={f.id} f={f} i={i} puedeEnviar={puedeEnviar} />)}
      </AnimatePresence>
    </ul>
  );
}

function Item({ f, i, puedeEnviar }: { f: FilaRecordatorio; i: number; puedeEnviar: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const marcar = () => iniciar(() => ejecutar(() => marcarEnviadoManual(f.id)));
  const copiar = async () => {
    try { await navigator.clipboard.writeText(f.mensaje); avisar("Mensaje copiado"); } catch { avisar("Selecciona el texto y cópialo", "error"); }
  };
  const enviado = f.estado === "enviado";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: pendiente ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: Math.min(i, 8) * 0.04 }}
      className="card lift flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <Avatar nombre={f.paciente} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{f.paciente}</p>
          <p className="truncate text-sm text-muted">{f.telefono ?? "Sin WhatsApp"} · {f.cuando} · {f.doctor}</p>
        </div>
        <span className={cn("shrink-0 rounded-chip px-2.5 py-1 text-xs font-semibold", f.tipo === "hoy" ? "bg-lime text-on-lime" : "bg-royal text-on-royal")}>
          {f.tipo === "hoy" ? "Mismo día" : "3 días antes"}
        </span>
      </div>

      {f.estado === "fallido" && (
        <p className="flex items-center gap-2 rounded-tile bg-danger/12 px-3 py-2 text-sm text-danger"><TriangleAlert className="size-4" /> El bot no pudo enviarlo{f.error ? `: ${f.error}` : ""}. Envíalo a mano.</p>
      )}
      {f.atrasado && f.estado === "pendiente" && <p className="text-xs text-warn">Debió salir antes: la cita se agendó con menos de 3 días.</p>}
      {enviado && <p className="flex items-center gap-2 text-sm text-ok"><Check className="size-4" /> Enviado {f.canal === "manual" ? "a mano" : "por el bot"}</p>}

      <p className="rounded-tile bg-sunken p-3 text-sm whitespace-pre-wrap text-muted">{f.mensaje}</p>

      {puedeEnviar && (
        <div className="flex flex-wrap gap-2">
          {!enviado && f.enlace && (
            <a href={f.enlace} target="_blank" rel="noopener" onClick={marcar} className="flex h-11 items-center gap-2 rounded-chip bg-lime px-4 text-sm font-semibold text-on-lime transition hover:-translate-y-0.5">
              <MessageCircle className="size-4" /> Enviar por WhatsApp
            </a>
          )}
          <button onClick={copiar} className="flex h-11 items-center gap-2 rounded-chip bg-raised px-4 text-sm font-semibold transition hover:bg-card"><Copy className="size-4" /> Copiar</button>
          {!enviado ? (
            <button onClick={marcar} className="flex h-11 items-center gap-2 rounded-chip bg-raised px-4 text-sm font-semibold transition hover:bg-card"><BellRing className="size-4" /> Marcar enviado</button>
          ) : (
            <button onClick={() => iniciar(() => ejecutar(() => volverAPendiente(f.id)))} className="flex h-11 items-center gap-2 rounded-chip bg-raised px-4 text-sm font-semibold transition hover:bg-card"><RotateCcw className="size-4" /> Deshacer</button>
          )}
          <Link href={`/agenda?vista=dia&fecha=${f.fechaCita}`} className="flex h-11 items-center rounded-chip px-4 text-sm font-semibold text-muted transition hover:text-ink">Ver en agenda</Link>
        </div>
      )}
    </motion.li>
  );
}
