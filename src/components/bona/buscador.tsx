"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";

/** Buscador de pacientes. En computadora es una píldora fija; en celular, una lupa que se despliega. */
export function Buscador() {
  const [abierto, setAbierto] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  return (
    <>
      <form action="/pacientes" role="search" className="hidden sm:block">
        <label className="flex h-11 w-56 items-center gap-2 rounded-chip bg-card px-4 text-muted transition focus-within:ring-2 focus-within:ring-lime lg:w-64">
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">Buscar pacientes</span>
          <input name="q" type="search" placeholder="Buscar pacientes…" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint" />
        </label>
      </form>

      <button
        onClick={() => { setAbierto(true); setTimeout(() => campo.current?.focus(), 50); }}
        aria-label="Buscar pacientes"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-card text-muted sm:hidden"
      >
        <Search className="size-[1.1rem]" />
      </button>
      <AnimatePresence>
        {abierto && (
          <motion.form
            action="/pacientes"
            role="search"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex h-14 items-center gap-2 rounded-chip bg-card px-4 shadow-lift ring-1 ring-hairline sm:hidden"
            onSubmit={() => setAbierto(false)}
          >
            <Search className="size-5 shrink-0 text-muted" aria-hidden />
            <label className="sr-only" htmlFor="buscar-movil">Buscar pacientes</label>
            <input ref={campo} id="buscar-movil" name="q" type="search" placeholder="Nombre o teléfono…" className="h-full w-full bg-transparent text-base text-ink outline-none placeholder:text-faint" />
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar búsqueda" className="grid size-9 shrink-0 place-items-center rounded-full bg-raised text-muted">
              <X className="size-4" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </>
  );
}
