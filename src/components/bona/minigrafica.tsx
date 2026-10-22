"use client";
import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { compacto } from "@/lib/dinero";
import type { Tono } from "@/lib/reglas/resumen";

const COLOR: Record<Tono, string> = { lime: "var(--color-lime)", coral: "var(--color-coral)", royal: "var(--color-info)" };
const TEXTO: Record<Tono, string> = { lime: "var(--color-on-lime)", coral: "#1c1c1e", royal: "#ffffff" };

/** Curva monótona en X (como d3.curveMonotoneX): suave y sin pasarse de los puntos. */
function caminoMonotono(p: [number, number][]): string {
  if (p.length < 2) return "";
  const n = p.length;
  const dx = p.slice(1).map((q, i) => q[0] - p[i][0]);
  const m = p.slice(1).map((q, i) => (q[1] - p[i][1]) / dx[i]);
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${p[i][0] + h},${p[i][1] + t[i] * h} ${p[i + 1][0] - h},${p[i + 1][1] - t[i + 1] * h} ${p[i + 1][0]},${p[i + 1][1]}`;
  }
  return d;
}

/**
 * Mini gráfica de línea suave con el punto más alto resaltado:
 * burbuja con el valor y línea punteada hasta la base (como en la referencia).
 */
export function MiniGrafica({ valores, tono, alto = 86, formato = "dinero" }: { valores: number[]; tono: Tono; alto?: number; formato?: "dinero" | "numero" }) {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const id = useId();

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = Math.max(1, ...valores);
  const min = Math.min(0, ...valores);
  const pad = { t: 30, b: 8, x: 6 };
  const pts: [number, number][] = valores.map((v, i) => [
    pad.x + (i / Math.max(1, valores.length - 1)) * (ancho - pad.x * 2),
    pad.t + (1 - (v - min) / (max - min || 1)) * (alto - pad.t - pad.b),
  ]);
  const iMax = valores.indexOf(Math.max(...valores));
  const destacado = pts[iMax];
  const etiqueta = formato === "dinero" ? compacto(valores[iMax] ?? 0) : String(valores[iMax] ?? 0);
  const anchoBurbuja = Math.max(30, etiqueta.length * 7 + 14);
  const color = COLOR[tono];
  const d = ancho ? caminoMonotono(pts) : "";

  return (
    <div ref={caja} className="w-full" style={{ height: alto }} aria-hidden>
      {ancho > 0 && (
        <svg width={ancho} height={alto} className="overflow-visible">
          <defs>
            <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={`${d}L${pts.at(-1)![0]},${alto}L${pts[0][0]},${alto}Z`}
            fill={`url(#g${id})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          />
          <motion.path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
          {destacado && (
            <motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, type: "spring", stiffness: 380, damping: 22 }}>
              <line x1={destacado[0]} x2={destacado[0]} y1={destacado[1] + 6} y2={alto} stroke={color} strokeWidth={2} strokeDasharray="2 4" strokeLinecap="round" />
              <circle cx={destacado[0]} cy={destacado[1]} r={6} fill={color} stroke="var(--color-card)" strokeWidth={3} />
              <rect
                x={Math.min(Math.max(0, destacado[0] - anchoBurbuja / 2), ancho - anchoBurbuja)}
                y={destacado[1] - 30}
                width={anchoBurbuja}
                height={19}
                rx={9.5}
                fill={color}
              />
              <text
                x={Math.min(Math.max(anchoBurbuja / 2, destacado[0]), ancho - anchoBurbuja / 2)}
                y={destacado[1] - 16.5}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill={TEXTO[tono]}
              >
                {etiqueta}
              </text>
            </motion.g>
          )}
        </svg>
      )}
    </div>
  );
}
