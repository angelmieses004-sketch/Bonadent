"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck } from "lucide-react";

type Aviso = { id: number; texto: string; tipo: "ok" | "error" };
const oyentes = new Set<(a: Aviso) => void>();
let n = 0;

/** Muestra un aviso flotante breve: avisar("Cita confirmada"). */
export function avisar(texto: string, tipo: Aviso["tipo"] = "ok") {
  const a = { id: ++n, texto, tipo };
  oyentes.forEach((f) => f(a));
}

export function Avisos() {
  const [lista, setLista] = useState<Aviso[]>([]);
  useEffect(() => {
    const f = (a: Aviso) => {
      setLista((l) => [...l, a]);
      setTimeout(() => setLista((l) => l.filter((x) => x.id !== a.id)), 3200);
    };
    oyentes.add(f);
    return () => void oyentes.delete(f);
  }, []);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
      <AnimatePresence>
        {lista.map((a) => (
          <motion.div
            key={a.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="flex items-center gap-2 rounded-chip bg-ink px-4 py-2.5 text-sm font-semibold text-shell shadow-lift"
          >
            {a.tipo === "ok" ? <CircleCheck className="size-4 text-ok" /> : <CircleAlert className="size-4 text-danger" />}
            {a.texto}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Ejecuta una server action que devuelve {error?, ok?} y avisa el resultado. */
export async function ejecutar(accion: () => Promise<{ error?: string; ok?: string } | undefined | void>) {
  try {
    const r = await accion();
    if (r && r.error) avisar(r.error, "error");
    else if (r && r.ok) avisar(r.ok);
  } catch {
    avisar("Algo salió mal. Intenta de nuevo.", "error");
  }
}
