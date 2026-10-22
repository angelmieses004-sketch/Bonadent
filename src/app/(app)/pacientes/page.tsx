import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Phone, TriangleAlert } from "lucide-react";
import { requerirUsuario } from "@/lib/sesion";
import { leer } from "@/datos/repo";
import { puede } from "@/lib/permisos";
import { saldoPaciente } from "@/lib/reglas/saldo";
import { esActiva } from "@/lib/reglas/recordatorios";
import { RD } from "@/lib/dinero";
import { fechaCorta, hora12, isoDia } from "@/lib/fechas";
import { coincide } from "@/lib/texto";
import { Aparecer } from "@/components/bona/aparecer";
import { Avatar } from "@/components/bona/avatar";
import { Pestanas } from "@/components/ui/pestanas";
import { FormularioPaciente } from "./formulario-paciente";

export const metadata: Metadata = { title: "Pacientes" };

export default async function PaginaPacientes({ searchParams }: PageProps<"/pacientes">) {
  const u = await requerirUsuario();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const filtro = typeof sp.f === "string" ? sp.f : "todos";
  const hoy = isoDia();
  const d = await leer();
  const verSaldo = puede(u.rol, "ver_caja");

  const filas = d.pacientes.map((p) => {
    const proxima = d.citas
      .filter((c) => c.paciente_id === p.id && esActiva(c) && c.fecha >= hoy)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];
    return { p, saldo: saldoPaciente(p.id, d.cotizaciones, d.movimientos), proxima };
  });
  const buscadas = q ? filas.filter((f) => coincide(`${f.p.nombre} ${f.p.telefono ?? ""}`, q)) : filas;
  const lista = buscadas.filter((f) => (filtro === "saldo" ? f.saldo > 0 : filtro === "cita" ? Boolean(f.proxima) : true));
  const conQ = (f: string) => `/pacientes?f=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const doc = new Map(d.doctores.map((x) => [x.id, x]));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pacientes</h2>
          <p className="text-sm text-muted">
            {q ? <>Resultados para «{q}» · <Link href="/pacientes" className="underline underline-offset-4 hover:text-ink">quitar búsqueda</Link></> : `${d.pacientes.length} en total`}
          </p>
        </div>
        <Pestanas
          grupo="pac"
          activo={filtro}
          items={[
            { valor: "todos", texto: "Todos", href: conQ("todos"), cuenta: buscadas.length },
            ...(verSaldo ? [{ valor: "saldo", texto: "Con saldo", href: conQ("saldo"), cuenta: buscadas.filter((f) => f.saldo > 0).length }] : []),
            { valor: "cita", texto: "Con cita próxima", href: conQ("cita"), cuenta: buscadas.filter((f) => f.proxima).length },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {!q && filtro === "todos" && <FormularioPaciente doctores={d.doctores} irAFicha />}
        {lista.map(({ p, saldo, proxima }, i) => (
          <Aparecer key={p.id} orden={Math.min(i, 10)}>
            <Link href={`/pacientes/${p.id}`} className="card lift group flex h-full min-h-40 flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar nombre={p.nombre} className="size-12 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.nombre}</p>
                  <p className="flex items-center gap-1.5 truncate text-sm text-muted">
                    <Phone className="size-3.5" aria-hidden />{p.telefono ?? "Sin WhatsApp"}
                  </p>
                </div>
                {p.es_ejemplo && <span className="rounded-chip border border-dashed border-warn/60 px-2 py-0.5 text-[0.65rem] text-warn">ejemplo</span>}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 text-xs">
                {proxima ? (
                  <span className="flex items-center gap-1.5 rounded-chip bg-raised px-3 py-1.5">
                    <CalendarClock className="size-3.5 text-lime" aria-hidden />
                    {fechaCorta(proxima.fecha)} · {hora12(proxima.hora)}
                  </span>
                ) : (
                  <span className="rounded-chip bg-raised px-3 py-1.5 text-muted">Sin cita</span>
                )}
                {p.alergias && (
                  <span className="flex items-center gap-1 rounded-chip bg-danger/12 px-3 py-1.5 text-danger">
                    <TriangleAlert className="size-3.5" aria-hidden /> {p.alergias}
                  </span>
                )}
                {p.doctor_principal_id && doc.get(p.doctor_principal_id) && (
                  <span className="rounded-chip bg-raised px-3 py-1.5 text-muted">{doc.get(p.doctor_principal_id)!.nombre}</span>
                )}
                {verSaldo && saldo > 0 && <span className="ml-auto text-sm font-bold tabular-nums text-coral">{RD(saldo)}</span>}
              </div>
            </Link>
          </Aparecer>
        ))}
      </div>
      {lista.length === 0 && (
        <div className="card grid place-items-center gap-2 py-14 text-center">
          <p className="text-lg font-semibold">No hay pacientes con ese filtro</p>
          <p className="text-sm text-muted">Prueba otra búsqueda o agrega un paciente nuevo.</p>
        </div>
      )}
    </>
  );
}
