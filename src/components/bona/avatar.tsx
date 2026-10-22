import { cn, iniciales } from "@/lib/utils";

const PALETA = ["#d4f75a", "#8fa2ff", "#ff8a5b", "#b48cff", "#7fe0c9", "#ffc65c"];
const colorDe = (nombre: string) => PALETA[[...nombre].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETA.length];

export function Avatar({ nombre, color, className }: { nombre: string; color?: string | null; className?: string }) {
  return (
    <span
      title={nombre}
      className={cn(
        "inline-grid size-8 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold text-[#1c1c1e] ring-2 ring-card",
        className,
      )}
      style={{ background: color ?? colorDe(nombre) }}
    >
      {iniciales(nombre)}
    </span>
  );
}

export function GrupoAvatares({ personas }: { personas: { nombre: string; color?: string | null }[] }) {
  return (
    <span className="flex -space-x-2">
      {personas.map((p) => (
        <Avatar key={p.nombre} {...p} />
      ))}
    </span>
  );
}
