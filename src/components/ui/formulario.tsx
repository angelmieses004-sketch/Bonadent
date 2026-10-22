"use client";
import { useFormStatus } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTES = {
  lima: "bg-lime text-on-lime hover:brightness-105",
  azul: "bg-royal text-on-royal hover:bg-royal-deep",
  suave: "bg-raised text-ink hover:bg-card",
  fantasma: "bg-transparent text-muted hover:bg-raised hover:text-ink",
  peligro: "bg-transparent text-danger hover:bg-danger/10",
};

export function Boton({ variante = "lima", className, cargando, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: keyof typeof VARIANTES; cargando?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || cargando}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-chip px-5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50",
        VARIANTES[variante],
        className,
      )}
    >
      {cargando && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** Botón de envío que muestra el estado del formulario padre. */
export function BotonEnviar({ children, ...props }: React.ComponentProps<typeof Boton>) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" cargando={pending} {...props}>
      {children}
    </Boton>
  );
}

export function Campo({ etiqueta, ayuda, error, className, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string; error?: string }) {
  const campoId = id ?? props.name;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={campoId} className="text-sm font-medium text-muted">{etiqueta}</label>
      <input
        id={campoId}
        aria-invalid={Boolean(error)}
        aria-describedby={ayuda || error ? `${campoId}-ayuda` : undefined}
        className="h-12 rounded-tile bg-sunken px-4 text-base text-ink outline-none ring-lime transition placeholder:text-faint focus:ring-2 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger"
        {...props}
      />
      {(ayuda || error) && (
        <p id={`${campoId}-ayuda`} className={cn("text-xs", error ? "text-danger" : "text-faint")}>{error ?? ayuda}</p>
      )}
    </div>
  );
}

export function Selector({ etiqueta, className, id, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string }) {
  const campoId = id ?? props.name;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={campoId} className="text-sm font-medium text-muted">{etiqueta}</label>
      <select id={campoId} className="h-12 rounded-tile bg-sunken px-4 text-base text-ink outline-none ring-lime transition focus:ring-2" {...props}>
        {children}
      </select>
    </div>
  );
}

export function AreaTexto({ etiqueta, className, id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { etiqueta: string }) {
  const campoId = id ?? props.name;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={campoId} className="text-sm font-medium text-muted">{etiqueta}</label>
      <textarea id={campoId} className="min-h-24 rounded-tile bg-sunken px-4 py-3 text-base text-ink outline-none ring-lime transition placeholder:text-faint focus:ring-2" {...props} />
    </div>
  );
}

/** Mensaje de error o éxito de un formulario, anunciado a lectores de pantalla. */
export function Aviso({ error, ok }: { error?: string; ok?: string }) {
  const texto = error ?? ok;
  return (
    <div role="status" aria-live="polite">
      <AnimatePresence>
        {texto && (
          <motion.p
            key={texto}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn("rounded-tile px-4 py-3 text-sm", error ? "bg-danger/12 text-danger" : "bg-ok/12 text-ok")}
          >
            {texto}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
