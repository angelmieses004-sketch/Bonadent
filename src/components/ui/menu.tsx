"use client";
import * as M from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OpcionMenu { texto: string; onSelect: () => void; peligro?: boolean; icono?: React.ReactNode }

/** Menú de acciones "…" accesible por teclado. */
export function Menu({ opciones, etiqueta, className }: { opciones: OpcionMenu[]; etiqueta: string; className?: string }) {
  return (
    <M.Root>
      <M.Trigger aria-label={etiqueta} className={cn("grid size-9 place-items-center rounded-full bg-card text-muted transition hover:text-ink data-[state=open]:bg-lime data-[state=open]:text-on-lime", className)}>
        <MoreHorizontal className="size-4" />
      </M.Trigger>
      <M.Portal>
        <M.Content align="end" sideOffset={6} className="z-50 min-w-48 rounded-card bg-shell p-1.5 shadow-lift ring-1 ring-hairline">
          {opciones.map((o) => (
            <M.Item
              key={o.texto}
              onSelect={o.onSelect}
              className={cn("flex min-h-10 cursor-pointer items-center gap-2 rounded-tile px-3 text-sm outline-none data-[highlighted]:bg-card", o.peligro ? "text-danger" : "text-ink")}
            >
              {o.icono}
              {o.texto}
            </M.Item>
          ))}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
