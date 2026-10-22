"use client";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronsLeftRight } from "lucide-react";
import { fechaCorta } from "@/lib/fechas";
import type { Panoramica } from "@/tipos";

/** Antes / después con un deslizador vertical que se arrastra (o con las flechas del teclado). */
export function Comparador({ antes, despues }: { antes: Panoramica; despues: Panoramica }) {
  const caja = useRef<HTMLDivElement>(null);
  const [corte, setCorte] = useState(50);
  const [arrastrando, setArrastrando] = useState(false);

  const mover = (clientX: number) => {
    const r = caja.current!.getBoundingClientRect();
    setCorte(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  const fecha = (p: Panoramica) => `${fechaCorta(p.tomada_en)} ${p.tomada_en.slice(0, 4)}`;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={caja}
        className="relative aspect-[2/1] w-full touch-none overflow-hidden rounded-card bg-black select-none"
        onPointerDown={(e) => { caja.current!.setPointerCapture(e.pointerId); setArrastrando(true); mover(e.clientX); }}
        onPointerMove={(e) => arrastrando && mover(e.clientX)}
        onPointerUp={() => setArrastrando(false)}
        onPointerCancel={() => setArrastrando(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada */}
        <img src={`/api/panoramicas/${antes.id}`} alt={`Antes: ${fecha(antes)}`} draggable={false} className="absolute inset-0 size-full object-contain" />
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada */}
        <img
          src={`/api/panoramicas/${despues.id}`}
          alt={`Después: ${fecha(despues)}`}
          draggable={false}
          className="absolute inset-0 size-full object-contain"
          style={{ clipPath: `inset(0 0 0 ${corte}%)` }}
        />
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `${corte}%` }}>
          <div className="absolute inset-y-0 -ml-px w-0.5 bg-lime shadow-[0_0_18px_3px_rgb(212_247_90/0.5)]" />
          <motion.div
            animate={{ scale: arrastrando ? 1.15 : 1 }}
            className="absolute top-1/2 -ml-5 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-lime text-on-lime shadow-lift"
          >
            <ChevronsLeftRight className="size-5" />
          </motion.div>
        </div>
        <span className="pointer-events-none absolute top-3 left-3 rounded-chip bg-black/65 px-3 py-1 text-xs text-white">Antes · {fecha(antes)}</span>
        <span className="pointer-events-none absolute top-3 right-3 rounded-chip bg-lime px-3 py-1 text-xs font-bold text-on-lime">Después · {fecha(despues)}</span>
      </div>
      <label className="flex items-center gap-3 text-sm text-muted">
        <span className="shrink-0">Antes</span>
        <input type="range" min={0} max={100} value={Math.round(corte)} onChange={(e) => setCorte(Number(e.target.value))} aria-label="Mover el corte entre antes y después" className="w-full accent-[var(--color-lime)]" />
        <span className="shrink-0">Después</span>
      </label>
    </div>
  );
}
