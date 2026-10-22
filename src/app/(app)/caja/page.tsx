import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { requerirRol } from "@/lib/sesion";
import { leer } from "@/datos/repo";
import { saldoPaciente } from "@/lib/reglas/saldo";
import { isoDia, mayuscula, nombreMes, sumarDias } from "@/lib/fechas";
import { RD } from "@/lib/dinero";
import { Aparecer } from "@/components/bona/aparecer";
import { Contador } from "@/components/bona/contador";
import { Pestanas } from "@/components/ui/pestanas";
import { CajaCliente } from "./cliente";

export const metadata: Metadata = { title: "Caja" };

export default async function PaginaCaja({ searchParams }: PageProps<"/caja">) {
  await requerirRol("admin", "recepcion");
  const sp = await searchParams;
  const hoy = isoDia();
  const mes = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoy.slice(0, 7);
  const tipo = sp.tipo === "ingreso" || sp.tipo === "egreso" ? sp.tipo : "todos";
  const d = await leer();

  const delMes = d.movimientos.filter((m) => m.fecha.startsWith(mes));
  const ing = delMes.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
  const egr = delMes.filter((m) => m.tipo === "egreso").reduce((a, m) => a + m.monto, 0);
  const cats = Object.entries(delMes.filter((m) => m.tipo === "egreso").reduce<Record<string, number>>((a, m) => ({ ...a, [m.categoria]: (a[m.categoria] ?? 0) + m.monto }), {})).sort((a, b) => b[1] - a[1]);
  const lista = delMes.filter((m) => tipo === "todos" || m.tipo === tipo).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const saldos = Object.fromEntries(d.pacientes.map((p) => [p.id, saldoPaciente(p.id, d.cotizaciones, d.movimientos)]));
  const mesAnt = sumarDias(`${mes}-01`, -1).slice(0, 7);
  const mesSig = sumarDias(`${mes}-28`, 5).slice(0, 7);
  const url = (m: string, t = tipo) => `/caja?mes=${m}${t !== "todos" ? `&tipo=${t}` : ""}`;

  const inicial = sp.nuevo === "ingreso" || sp.nuevo === "egreso"
    ? { tipo: sp.nuevo as "ingreso" | "egreso", paciente_id: typeof sp.paciente === "string" ? sp.paciente : undefined, concepto: typeof sp.concepto === "string" ? sp.concepto : undefined }
    : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={url(mesAnt)} aria-label="Mes anterior" className="grid size-11 place-items-center rounded-full bg-card transition hover:bg-raised">‹</Link>
          <h2 className="text-2xl font-bold tracking-tight">{mayuscula(nombreMes(`${mes}-15`))}</h2>
          <Link href={url(mesSig)} aria-label="Mes siguiente" className="grid size-11 place-items-center rounded-full bg-card transition hover:bg-raised">›</Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pestanas grupo="caja" activo={tipo} items={[
            { valor: "todos", texto: "Todos", href: url(mes, "todos") },
            { valor: "ingreso", texto: "Ingresos", href: url(mes, "ingreso") },
            { valor: "egreso", texto: "Egresos", href: url(mes, "egreso") },
          ]} />
          <a href={`/api/caja/excel?mes=${mes}${tipo !== "todos" ? `&tipo=${tipo}` : ""}`} className="flex h-11 items-center gap-2 rounded-chip bg-card px-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:text-lime">
            <FileSpreadsheet className="size-4" /> Exportar a Excel
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Aparecer orden={0} className="card lift"><p className="text-sm text-muted">Ingresos</p><Contador valor={ing} formato="dinero" className="mt-1 block text-2xl font-bold tabular-nums text-lime sm:text-3xl" /></Aparecer>
        <Aparecer orden={1} className="card lift"><p className="text-sm text-muted">Egresos</p><Contador valor={egr} formato="dinero" className="mt-1 block text-2xl font-bold tabular-nums text-coral sm:text-3xl" /></Aparecer>
        <Aparecer orden={2} className="lift rounded-card bg-royal p-5 text-on-royal"><p className="text-sm text-white/75">Balance</p><Contador valor={ing - egr} formato="dinero" className="mt-1 block text-2xl font-bold tabular-nums sm:text-3xl" /></Aparecer>
        <Aparecer orden={3} className="card lift">
          <p className="text-sm text-muted">Mayor gasto</p>
          <p className="mt-1 truncate text-xl font-bold">{cats[0]?.[0] ?? "—"}</p>
          {cats[0] && <p className="text-sm tabular-nums text-muted">{RD(cats[0][1])}</p>}
        </Aparecer>
      </div>

      <CajaCliente movimientos={lista} pacientes={d.pacientes} saldos={saldos} inicial={inicial} />
    </>
  );
}
