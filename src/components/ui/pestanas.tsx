"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Pestañas en píldora que cambian la URL (?tab=…), con indicador lima deslizante. */
export function Pestanas({ items, activo, grupo, className }: {
  items: { valor: string; texto: string; href: string; cuenta?: number }[];
  activo: string;
  grupo: string;
  className?: string;
}) {
  return (
    <nav aria-label="Secciones" className={cn("flex gap-1 overflow-x-auto rounded-chip bg-sunken p-1 [scrollbar-width:none]", className)}>
      {items.map((i) => {
        const on = i.valor === activo;
        return (
          <Link
            key={i.valor}
            href={i.href}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={cn("relative flex min-h-10 shrink-0 items-center rounded-chip px-4 text-sm font-medium transition-colors duration-200", on ? "text-on-lime" : "text-muted hover:text-ink")}
          >
            {on && <motion.span layoutId={`tab-${grupo}`} className="absolute inset-0 rounded-chip bg-lime" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className="relative whitespace-nowrap">
              {i.texto}
              {i.cuenta !== undefined && <span className="ml-1.5 tabular-nums opacity-70">{i.cuenta}</span>}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
