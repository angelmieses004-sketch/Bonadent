import { Aparecer } from "./aparecer";

/** Estado vacío diseñado para los módulos que llegan en fases siguientes. */
export function ProximaFase({ titulo, fase, puntos }: { titulo: string; fase: number; puntos: string[] }) {
  return (
    <Aparecer className="card flex flex-col gap-5 md:flex-row md:items-center md:gap-10 md:p-8">
      <div className="flex flex-1 flex-col gap-2">
        <span className="self-start rounded-chip bg-lime px-3 py-1 text-xs font-bold text-on-lime">Fase {fase}</span>
        <h2 className="text-3xl font-bold tracking-tight">{titulo}</h2>
        <p className="max-w-prose text-muted">Este módulo se construye en la fase {fase}. Esto es lo que va a tener:</p>
      </div>
      <ul className="grid flex-1 gap-2">
        {puntos.map((p, i) => (
          <Aparecer key={p} orden={i + 1} className="flex items-center gap-3 rounded-tile border-2 border-dashed border-hairline px-4 py-3 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-raised text-xs font-bold tabular-nums text-lime">{i + 1}</span>
            {p}
          </Aparecer>
        ))}
      </ul>
    </Aparecer>
  );
}
