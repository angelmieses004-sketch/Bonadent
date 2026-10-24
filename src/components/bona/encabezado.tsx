import Link from "next/link";
import { Plus } from "lucide-react";
import { fechaCorta, fechaLarga, isoDia, mayuscula, saludo } from "@/lib/fechas";
import type { Usuario } from "@/tipos";
import { CambiarTema } from "./cambiar-tema";
import { Buscador } from "./buscador";

/** "Dra. Laura Peña" → "Dra. Peña"; "Carmen Reyes" → "Carmen". */
export function nombreCorto(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (/^dra?\.$/i.test(partes[0] ?? "") && partes.length > 1) return `${partes[0]} ${partes.at(-1)}`;
  return partes[0] ?? nombre;
}

export function Encabezado({ usuario, tema }: { usuario: Usuario; tema: "dark" | "light" }) {
  const hoy = isoDia();
  return (
    <header className="flex items-center gap-2.5 md:gap-4">
      <Link href="/resumen" aria-label="Inicio" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lime text-lg font-black text-on-lime md:hidden">B</Link>
      <div className="mr-auto min-w-0">
        <h1 className="truncate text-xl leading-tight font-bold tracking-tight md:text-[1.7rem]">Hola, {nombreCorto(usuario.nombre)}</h1>
        <p className="truncate text-xs text-muted md:text-sm">
          <span className="md:hidden">{mayuscula(fechaLarga(hoy).split(",")[0])} {fechaCorta(hoy)}</span>
          <span className="hidden md:inline">{saludo()} · {mayuscula(fechaLarga(hoy))}</span>
        </p>
      </div>

      <Buscador />
      <CambiarTema inicial={tema} />

      <Link
        href="/agenda?nueva=1"
        className="hidden h-11 items-center gap-2 rounded-chip bg-royal px-5 text-sm font-semibold text-on-royal transition duration-200 hover:-translate-y-0.5 hover:bg-royal-deep hover:shadow-lift active:translate-y-0 md:inline-flex"
      >
        <Plus className="size-4" /> Nueva cita
      </Link>
    </header>
  );
}
