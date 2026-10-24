import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, FileText, MessageCircle, Pencil, TriangleAlert, Wallet } from "lucide-react";
import { requerirUsuario } from "@/lib/sesion";
import { leer, leerClinico } from "@/datos/repo";
import { puede } from "@/lib/permisos";
import { saldoPaciente } from "@/lib/reglas/saldo";
import { esActiva } from "@/lib/reglas/recordatorios";
import { resumenOdontograma } from "@/lib/reglas/odontograma";
import { RD } from "@/lib/dinero";
import { fechaCorta, fechaLarga, hora12, isoDia, mayuscula } from "@/lib/fechas";
import { edad } from "@/lib/texto";
import { numeroCot } from "@/lib/mensajes";
import { cn } from "@/lib/utils";
import { Aparecer } from "@/components/bona/aparecer";
import { Avatar } from "@/components/bona/avatar";
import { Contador } from "@/components/bona/contador";
import { ESTADO_CITA } from "@/lib/estados";
import { Pestanas } from "@/components/ui/pestanas";
import { FormularioPaciente } from "../formulario-paciente";
import { PanelClinico } from "./clinico/panel-clinico";

export async function generateMetadata({ params }: PageProps<"/pacientes/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = (await leer()).pacientes.find((x) => x.id === id);
  return { title: p?.nombre ?? "Paciente" };
}

const ACCION = "flex h-16 flex-col items-center justify-center gap-1 rounded-tile bg-raised text-xs font-semibold transition active:scale-95 sm:h-11 sm:flex-row sm:gap-2 sm:rounded-chip sm:px-4 sm:text-sm sm:hover:-translate-y-0.5";
const COT_ESTADO = { borrador: "bg-raised text-muted", enviada: "bg-info/15 text-info", aprobada: "bg-ok/15 text-ok", rechazada: "bg-danger/12 text-danger" };

export default async function FichaPaciente({ params, searchParams }: PageProps<"/pacientes/[id]">) {
  const u = await requerirUsuario();
  const { id } = await params;
  const sp = await searchParams;
  const d = await leer();
  const p = d.pacientes.find((x) => x.id === id);
  if (!p) notFound();

  const hoy = isoDia();
  const clinico = await leerClinico(id, u);
  const verCaja = puede(u.rol, "ver_caja");
  const tab = (["datos", "citas", "cuenta", "clinico"] as const).find((t) => t === sp.tab) ?? "datos";
  const citas = d.citas.filter((c) => c.paciente_id === id).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  const proxima = [...citas].reverse().find((c) => esActiva(c) && c.fecha >= hoy);
  const visitas = citas.filter((c) => c.estado === "completada");
  const cotizaciones = d.cotizaciones.filter((q) => q.paciente_id === id);
  const pagos = d.movimientos.filter((m) => m.paciente_id === id && m.tipo === "ingreso").sort((a, b) => b.fecha.localeCompare(a.fecha));
  const saldo = saldoPaciente(id, d.cotizaciones, d.movimientos);
  const odo = resumenOdontograma(clinico.piezas);
  const doc = new Map(d.doctores.map((x) => [x.id, x]));
  const años = edad(p.fecha_nacimiento, hoy);
  const base = `/pacientes/${id}`;

  return (
    <>
      <Aparecer className="card flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar nombre={p.nombre} className="size-14 text-base sm:size-16 sm:text-lg" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{p.nombre}</h2>
            <p className="text-sm text-muted">
              {años !== null ? `${años} años · ` : ""}{p.telefono ?? "Sin WhatsApp"}
              {p.doctor_principal_id && doc.get(p.doctor_principal_id) ? ` · ${doc.get(p.doctor_principal_id)!.nombre}` : ""}
            </p>
            {p.alergias && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-chip bg-danger/12 px-3 py-1 text-sm font-semibold text-danger">
                <TriangleAlert className="size-4" /> Alergia: {p.alergias}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
          <FormularioPaciente paciente={p} doctores={d.doctores} disparador={
            <button className={ACCION}><Pencil className="size-4" /> Editar</button>
          } />
          {p.telefono && (
            <a href={`https://wa.me/1${p.telefono.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener" className={`${ACCION} hover:text-ok`}>
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          )}
          <Link href={`/cotizaciones/nueva?paciente=${id}`} className={ACCION}><FileText className="size-4" /> Cotizar</Link>
          {verCaja && <Link href={`/caja?nuevo=ingreso&paciente=${id}`} className={ACCION}><Wallet className="size-4" /> Cobrar</Link>}
          <Link href={`/agenda?nueva=1&paciente=${id}`} className="col-span-4 flex h-12 items-center justify-center gap-2 rounded-chip bg-royal px-4 text-sm font-semibold text-on-royal transition hover:-translate-y-0.5 hover:bg-royal-deep sm:h-11"><CalendarPlus className="size-4" /> Nueva cita</Link>
        </div>
      </Aparecer>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {verCaja && (
          <Aparecer orden={1} className="card lift p-4 sm:p-5">
            <p className="text-sm text-muted">Saldo pendiente</p>
            <Contador valor={saldo} formato="dinero" className={cn("mt-1 block text-xl font-bold tabular-nums sm:text-3xl", saldo > 0 ? "text-coral" : "text-ok")} />
          </Aparecer>
        )}
        <Aparecer orden={2} className="card lift p-4 sm:p-5">
          <p className="text-sm text-muted">Próxima cita</p>
          <p className="mt-1 text-base leading-tight font-bold sm:text-xl">{proxima ? `${fechaCorta(proxima.fecha)} · ${hora12(proxima.hora)}` : "Sin agendar"}</p>
          {proxima && <p className="truncate text-xs text-muted">{proxima.tratamiento}</p>}
        </Aparecer>
        <Aparecer orden={3} className="card lift p-4 sm:p-5">
          <p className="text-sm text-muted">Visitas completadas</p>
          <Contador valor={visitas.length} className="mt-1 block text-2xl font-bold tabular-nums sm:text-3xl" />
        </Aparecer>
        <Aparecer orden={4} className="card lift p-4 sm:p-5">
          <p className="text-sm text-muted">Piezas por tratar</p>
          <Contador valor={odo.pendientes} className="mt-1 block text-2xl font-bold tabular-nums text-lime sm:text-3xl" />
        </Aparecer>
      </div>

      <Pestanas grupo="ficha" activo={tab} className="self-start" items={[
        { valor: "datos", texto: "Datos", href: `${base}?tab=datos` },
        { valor: "clinico", texto: "Panorámica y odontograma", href: `${base}?tab=clinico` },
        { valor: "citas", texto: "Citas", href: `${base}?tab=citas`, cuenta: citas.length },
        ...(verCaja ? [{ valor: "cuenta", texto: "Cuenta", href: `${base}?tab=cuenta` }] : []),
      ]} />

      {tab === "datos" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Aparecer className="card flex flex-col gap-3">
            <h3 className="text-lg font-semibold">Datos del paciente</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted">WhatsApp</dt><dd>{p.telefono ?? "—"}</dd>
              <dt className="text-muted">Nacimiento</dt><dd>{p.fecha_nacimiento ? `${fechaCorta(p.fecha_nacimiento)} ${p.fecha_nacimiento.slice(0, 4)}` : "—"}</dd>
              <dt className="text-muted">Alergias</dt><dd className={p.alergias ? "font-semibold text-danger" : ""}>{p.alergias ?? "Ninguna registrada"}</dd>
              <dt className="text-muted">Cabecera</dt><dd>{p.doctor_principal_id ? doc.get(p.doctor_principal_id)?.nombre : "—"}</dd>
            </dl>
          </Aparecer>
          <Aparecer orden={1} className="card flex flex-col gap-3">
            <h3 className="text-lg font-semibold">Notas</h3>
            <p className="whitespace-pre-wrap text-sm text-muted">{p.notas || "Sin notas. Usa «Editar» para agregar."}</p>
          </Aparecer>
        </div>
      )}

      {tab === "citas" && (
        <Aparecer className="card flex flex-col gap-2">
          {citas.length ? citas.map((c) => (
            <Link key={c.id} href={`/agenda?vista=dia&fecha=${c.fecha}`} className="flex flex-wrap items-center gap-3 rounded-tile bg-raised p-3 transition hover:-translate-y-0.5">
              <span className="w-28 text-sm font-semibold tabular-nums">{fechaCorta(c.fecha)} · {c.hora}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{c.tratamiento} <span className="text-muted">· {c.doctor_id ? doc.get(c.doctor_id)?.nombre : ""}</span></span>
              <span className={cn("rounded-chip px-2.5 py-1 text-xs font-semibold", ESTADO_CITA[c.estado].clase)}>{ESTADO_CITA[c.estado].texto}</span>
            </Link>
          )) : <p className="py-8 text-center text-sm text-muted">Todavía no tiene citas.</p>}
        </Aparecer>
      )}

      {tab === "cuenta" && verCaja && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Aparecer className="card flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Cotizaciones</h3>
            {cotizaciones.length ? cotizaciones.map((q) => (
              <Link key={q.id} href={`/cotizaciones/${q.id}`} className="flex items-center gap-3 rounded-tile bg-raised p-3 transition hover:-translate-y-0.5">
                <span className="text-sm font-semibold tabular-nums">{numeroCot(q.numero)}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{q.items.map((i) => i.nombre).join(", ")}</span>
                <span className={cn("rounded-chip px-2.5 py-1 text-xs font-semibold capitalize", COT_ESTADO[q.estado])}>{q.estado}</span>
                <span className="text-sm font-bold tabular-nums">{RD(q.total)}</span>
              </Link>
            )) : <p className="py-6 text-center text-sm text-muted">Sin cotizaciones.</p>}
          </Aparecer>
          <Aparecer orden={1} className="card flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-semibold">Pagos</h3>
              <span className="text-xs text-muted">Saldo = aprobadas − pagos</span>
            </div>
            {pagos.length ? pagos.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-tile bg-raised p-3">
                <span className="w-16 text-sm tabular-nums text-muted">{fechaCorta(m.fecha)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{m.concepto} <span className="text-muted">· {m.metodo}</span></span>
                <span className="text-sm font-bold tabular-nums text-ok">+{RD(m.monto)}</span>
              </div>
            )) : <p className="py-6 text-center text-sm text-muted">Sin pagos registrados.</p>}
          </Aparecer>
        </div>
      )}

      {tab === "clinico" && (
        <PanelClinico
          paciente={{ id: p.id, nombre: p.nombre }}
          clinico={clinico}
          rol={u.rol}
          doctores={d.doctores}
          servicios={d.servicios}
          iaActiva={d.clinica.ia_sugerencias}
          hoyLargo={mayuscula(fechaLarga(hoy))}
        />
      )}
    </>
  );
}
