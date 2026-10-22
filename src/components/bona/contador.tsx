"use client";
import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { RD } from "@/lib/dinero";

const FORMATOS = {
  dinero: (n: number) => RD(Math.round(n)),
  numero: (n: number) => new Intl.NumberFormat("es-DO").format(Math.round(n)),
  porcentaje: (n: number) => `${Math.round(n)}%`,
};

/** Número que sube desde 0 la primera vez que aparece en pantalla. */
export function Contador({ valor, formato = "numero", className }: { valor: number; formato?: keyof typeof FORMATOS; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visto = useInView(ref, { once: true });
  const quieto = useReducedMotion();
  const fmt = FORMATOS[formato];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (quieto || !visto) {
      el.textContent = fmt(quieto ? valor : 0);
      return;
    }
    const ctl = animate(0, valor, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = fmt(v)),
    });
    return () => ctl.stop();
  }, [valor, visto, quieto, fmt]);

  return (
    <span ref={ref} className={className} aria-label={fmt(valor)}>
      {fmt(valor)}
    </span>
  );
}
