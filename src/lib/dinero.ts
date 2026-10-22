const fmt = new Intl.NumberFormat("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** 34770 → "RD$ 34,770" */
export const RD = (n: number | null | undefined) => `RD$ ${fmt.format(Number(n ?? 0))}`;

/** 34770 → "34.8K" para mini etiquetas en gráficas. */
export function compacto(n: number): string {
  return new Intl.NumberFormat("es-DO", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
