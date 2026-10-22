import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { fechaLarga, isoDia, mayuscula, saludo } from "@/lib/fechas";
import type { Usuario } from "@/tipos";
import { CambiarTema } from "./cambiar-tema";

/** "Dra. Laura Peña" → "Dra. Peña"; "Carmen Reyes" → "Carmen". */
export function nombreCorto(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (/^dra?\.$/i.test(partes[0] ?? "") && partes.length > 1) return `${partes[0]} ${partes.at(-1)}`;
  return partes[0] ?? nombre;
}

export function Encabezado({ usuario, tema }: { usuario: Usuario; tema: "dark" | "light" }) {
  return (
    <header className="flex flex-wrap items-center gap-3 md:gap-4">
      <div className="mr-auto min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight md:text-[1.7rem]">
          Hola, {nombreCorto(usuario.nombre)}
        </h1>
        <p className="text-sm text-muted">
          {saludo()} · {mayuscula(fechaLarga(isoDia()))}
        </p>
      </div>

      <form action="/pacientes" role="search" className="order-last w-full sm:order-none sm:w-auto">
        <label className="flex h-11 items-center gap-2 rounded-chip bg-card px-4 text-muted transition focus-within:ring-2 focus-within:ring-lime sm:w-64">
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">Buscar pacientes</span>
          <input name="q" type="search" placeholder="Buscar pacientes…" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint" />
        </label>
      </form>

      <CambiarTema inicial={tema} />

      <Link
        href="/agenda?nueva=1"
        className="inline-flex h-11 items-center gap-2 rounded-chip bg-royal px-5 text-sm font-semibold text-on-royal transition duration-200 hover:-translate-y-0.5 hover:bg-royal-deep hover:shadow-lift active:translate-y-0"
      >
        <Plus className="size-4" /> Nueva cita
      </Link>
    </header>
  );
}
