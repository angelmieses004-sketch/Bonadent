"use client";
import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Chips de filtro en píldora. El fondo lima se desliza al chip activo. */
export function Chips<T extends string>({ opciones, valor, onCambio, etiqueta, enUnaFila }: {
  opciones: { valor: T; texto: string; cuenta?: number }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
  /** Una sola fila deslizable (para muchas opciones en celular) */
  enUnaFila?: boolean;
}) {
  const grupo = useId();
  return (
    <div role="tablist" aria-label={etiqueta} className={cn("inline-flex gap-1 rounded-chip bg-sunken p-1", enUnaFila ? "flex-nowrap" : "flex-wrap")}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            role="tab"
            aria-selected={activo}
            onClick={() => onCambio(o.valor)}
            className={cn(
              "relative min-h-9 shrink-0 rounded-chip px-4 text-sm font-medium whitespace-nowrap transition-colors duration-200",
              activo ? "text-on-lime" : "text-muted hover:text-ink",
            )}
          >
            {activo && <motion.span layoutId={`chip-${grupo}`} className="absolute inset-0 rounded-chip bg-lime" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
            <span className="relative">
              {o.texto}
              {o.cuenta !== undefined && <span className="ml-1.5 tabular-nums opacity-70">{o.cuenta}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
