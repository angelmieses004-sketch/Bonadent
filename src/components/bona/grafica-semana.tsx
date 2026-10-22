"use client";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { fechaCorta } from "@/lib/fechas";
import { RD } from "@/lib/dinero";

/** Ingresos vs. egresos de los últimos 7 días. */
export function GraficaSemana({ datos }: { datos: { dia: string; ingreso: number; egreso: number }[] }) {
  const filas = datos.map((d) => ({ ...d, etiqueta: fechaCorta(d.dia).replace(".", "") }));
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer>
        <BarChart data={filas} barGap={3} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "var(--color-faint)", fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: "var(--color-raised)", radius: 10 }}
            contentStyle={{ background: "var(--color-shell)", border: "none", borderRadius: 14, color: "var(--color-ink)", fontSize: 12 }}
            formatter={(v, n) => [RD(Number(v)), n === "ingreso" ? "Ingresos" : "Egresos"]}
            labelStyle={{ color: "var(--color-muted)" }}
          />
          <Bar dataKey="ingreso" fill="var(--color-lime)" radius={[8, 8, 8, 8]} maxBarSize={14} animationDuration={900} />
          <Bar dataKey="egreso" fill="var(--color-coral)" radius={[8, 8, 8, 8]} maxBarSize={14} animationDuration={900} animationBegin={150} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
