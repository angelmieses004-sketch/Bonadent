"use client";
import * as D from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Diálogo animado. En celular sube desde abajo; en pantallas grandes aparece al centro. */
export function Dialogo({ abierto, onCambio, titulo, descripcion, children, ancho = "max-w-lg", disparador }: {
  abierto: boolean;
  onCambio: (v: boolean) => void;
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
  ancho?: string;
  disparador?: React.ReactNode;
}) {
  return (
    <D.Root open={abierto} onOpenChange={onCambio}>
      {disparador && <D.Trigger asChild>{disparador}</D.Trigger>}
      <AnimatePresence>
        {abierto && (
          <D.Portal forceMount>
            <D.Overlay asChild>
              <motion.div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </D.Overlay>
            <D.Content asChild aria-describedby={descripcion ? undefined : undefined}>
              <motion.div
                className={cn(
                  "fixed inset-x-2 bottom-2 z-50 mx-auto flex max-h-[92dvh] flex-col overflow-hidden rounded-panel bg-shell shadow-lift sm:inset-x-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
                  ancho,
                )}
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.97, transition: { duration: 0.16 } }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              >
                <div className="flex items-start justify-between gap-4 p-5 pb-3 sm:p-6 sm:pb-3">
                  <div>
                    <D.Title className="text-xl font-bold">{titulo}</D.Title>
                    {descripcion ? <D.Description className="text-sm text-muted">{descripcion}</D.Description> : <D.Description className="sr-only">{titulo}</D.Description>}
                  </div>
                  <D.Close aria-label="Cerrar" className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-muted transition hover:rotate-90 hover:text-ink">
                    <X className="size-4" />
                  </D.Close>
                </div>
                <div className="overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
              </motion.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  );
}
