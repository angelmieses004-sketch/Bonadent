"use client";
import { motion } from "motion/react";
import { Activity, Anchor, Check, CircleDot, CircleOff, Crown, Scissors, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { ESTADOS, ORDEN_ESTADOS, esPendiente, piezasDe, tipoPieza, type Denticion, type InfoEstado } from "@/lib/reglas/odontograma";
import type { EstadoPieza, PiezaDental } from "@/tipos";

export const ICONO: Record<InfoEstado["icono"], typeof Check> = { Check, CircleDot, Square, Activity, Crown, Anchor, CircleOff, Scissors };

export function IconoEstado({ estado, className }: { estado: EstadoPieza; className?: string }) {
  const I = ICONO[ESTADOS[estado].icono];
  return <I className={className} style={{ color: ESTADOS[estado].color }} aria-hidden />;
}

const RAIZ = {
  molar: "M8 30 L10 7 Q12 2 15 7 L18 26 L22 26 L25 7 Q28 2 30 7 L32 30Z",
  unica: "M12 30 Q14 5 20 2 Q26 5 28 30Z",
};
const CORONA = {
  molar: "M4 30 H36 V47 Q36 58 27 57 Q20 53 13 57 Q4 58 4 47Z",
  premolar: "M7 30 H33 V46 Q33 57 20 57 Q7 57 7 46Z",
  canino: "M9 30 H31 V43 Q31 51 20 58 Q9 51 9 43Z",
  incisivo: "M10 30 H30 V51 Q30 57 24 57 H16 Q10 57 10 51Z",
};

function Diente({ numero, pieza, abajo, activa, conMarcador, onClick, i, desplaz }: {
  numero: number; pieza?: PiezaDental; abajo: boolean; activa: boolean; conMarcador: boolean; onClick: () => void; i: number; desplaz: number;
}) {
  const tipo = tipoPieza(numero);
  const estado: EstadoPieza = pieza?.estado ?? "sana";
  const info = ESTADOS[estado];
  const ausente = estado === "ausente";
  const registrada = Boolean(pieza) && estado !== "sana";
  const pendiente = pieza ? esPendiente(pieza) : false;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      aria-label={`Pieza ${numero}: ${info.nombre}${pieza?.situacion ? ` (${pieza.situacion})` : ""}${pendiente ? ", pendiente" : ""}`}
      initial={{ opacity: 0, y: abajo ? 14 : -14 }}
      animate={{ opacity: 1, y: desplaz }}
      whileHover={{ y: desplaz + (abajo ? 4 : -4), scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      transition={{ delay: i * 0.018, type: "spring", stiffness: 420, damping: 24 }}
      className={cn("group relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-0.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-lime", abajo && "flex-col-reverse", activa && "bg-lime/15")}
    >
      <span className={cn("text-[0.7rem] font-bold tabular-nums", activa ? "text-lime" : "text-muted")}>{numero}</span>
      <span className="relative w-full max-w-11">
        <svg viewBox="0 0 40 60" className={cn("w-full", abajo && "-scale-y-100")} aria-hidden>
          <path d={tipo === "molar" ? RAIZ.molar : RAIZ.unica} fill={ausente ? "none" : "var(--color-raised)"} stroke="var(--color-faint)" strokeWidth="1.5" strokeDasharray={ausente ? "3 3" : undefined} />
          <path
            d={CORONA[tipo]}
            fill={ausente ? "none" : registrada ? `color-mix(in oklab, ${info.color} 35%, var(--color-card))` : "var(--color-sunken)"}
            stroke={activa ? "var(--color-lime)" : registrada ? info.color : "var(--color-faint)"}
            strokeWidth={activa ? 3 : 1.8}
            strokeDasharray={ausente ? "3 3" : undefined}
          />
          {estado === "endodoncia" && <path d="M20 30 L20 6" stroke={info.color} strokeWidth="3" strokeLinecap="round" />}
          {estado === "implante" && <path d="M16 8 H24 M15 14 H25 M16 20 H24 M15 26 H25" stroke={info.color} strokeWidth="2.5" strokeLinecap="round" />}
        </svg>
        {registrada && !ausente && (
          <span className={cn("absolute left-1/2 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-shell shadow", abajo ? "top-[12%]" : "bottom-[12%]")}>
            <IconoEstado estado={estado} className="size-3" />
          </span>
        )}
        {conMarcador && <span className={cn("absolute right-0 size-2 rounded-full bg-lime ring-2 ring-card", abajo ? "bottom-1" : "top-1")} title="Tiene marcador en la panorámica" />}
        {pendiente && <span className="absolute -left-0.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-coral" />}
      </span>
    </motion.button>
  );
}

/** Odontograma con arcada superior e inferior en curva. */
export function Odontograma({ denticion, piezas, piezasConMarcador, activa, onElegir }: {
  denticion: Denticion;
  piezas: PiezaDental[];
  piezasConMarcador: Set<number>;
  activa: number | null;
  onElegir: (n: number) => void;
}) {
  const mapa = new Map(piezas.map((p) => [p.pieza_fdi, p]));
  const { superior, inferior } = piezasDe(denticion);
  const curva = (i: number, n: number) => Math.pow((i - (n - 1) / 2) / ((n - 1) / 2), 2) * 16;

  const mitad = superior.length / 2;
  const cuadrante = (titulo: string, lado: string, piezas: number[], abajo: boolean, base: number) => (
    <div className="flex flex-col gap-1">
      <span className="px-1 text-[0.65rem] font-semibold tracking-widest text-faint uppercase">{titulo} · {lado}</span>
      <div className="flex justify-between gap-0.5 rounded-tile bg-sunken/60 px-1">
        {piezas.map((n, i) => (
          <Diente key={n} numero={n} pieza={mapa.get(n)} abajo={abajo} activa={activa === n} conMarcador={piezasConMarcador.has(n)} onClick={() => onElegir(n)} i={base + i} desplaz={0} />
        ))}
      </div>
    </div>
  );

  return (
    <>
    {/* Celular: cuadrantes de 8 (o 5) piezas, todo visible sin desplazar */}
    <div className="flex flex-col gap-3 sm:hidden">
      {cuadrante("Superior", "derecha", superior.slice(0, mitad), false, 0)}
      {cuadrante("Superior", "izquierda", superior.slice(mitad), false, mitad)}
      <div className="h-px bg-hairline" />
      {cuadrante("Inferior", "izquierda", inferior.slice(mitad), true, mitad * 2)}
      {cuadrante("Inferior", "derecha", inferior.slice(0, mitad), true, mitad * 3)}
    </div>
    <div className="hidden overflow-x-auto pb-1 sm:block">
      <div className="mx-auto flex min-w-[600px] max-w-4xl flex-col gap-2 px-1 py-5">
        <div className="flex items-end justify-between gap-0.5 sm:gap-1">
          {superior.map((n, i) => (
            <Diente key={n} numero={n} pieza={mapa.get(n)} abajo={false} activa={activa === n} conMarcador={piezasConMarcador.has(n)} onClick={() => onElegir(n)} i={i} desplaz={-curva(i, superior.length)} />
          ))}
        </div>
        <div className="flex items-center gap-3 px-6 text-[0.65rem] font-semibold tracking-widest text-faint uppercase">
          <span>Derecha</span><span className="h-px flex-1 bg-hairline" /><span>Superior · Inferior</span><span className="h-px flex-1 bg-hairline" /><span>Izquierda</span>
        </div>
        <div className="flex items-start justify-between gap-0.5 sm:gap-1">
          {inferior.map((n, i) => (
            <Diente key={n} numero={n} pieza={mapa.get(n)} abajo activa={activa === n} conMarcador={piezasConMarcador.has(n)} onClick={() => onElegir(n)} i={i + superior.length} desplaz={curva(i, inferior.length)} />
          ))}
        </div>
      </div>
    </div>
    </>
  );
}

export function Leyenda() {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Leyenda de estados">
      {ORDEN_ESTADOS.map((e) => (
        <li key={e} className="flex items-center gap-1.5 rounded-chip bg-raised px-2.5 py-1 text-xs">
          <IconoEstado estado={e} className="size-3.5" /> {ESTADOS[e].nombre}
        </li>
      ))}
    </ul>
  );
}
