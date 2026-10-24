import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BellRing } from "lucide-react";
import { requerirUsuario } from "@/lib/sesion";
import { leer } from "@/datos/repo";
import { calcularResumen } from "@/lib/reglas/resumen";
import { estadoStock, porReponer } from "@/lib/reglas/inventario";
import { Package } from "lucide-react";
import { puede } from "@/lib/permisos";
import { RD } from "@/lib/dinero";
import { fechaCorta, hora12, isoDia, mayuscula, nombreMes, ZONA } from "@/lib/fechas";
import { Aparecer } from "@/components/bona/aparecer";
import { TarjetaMetricas } from "@/components/bona/tarjeta-metricas";
import { CalendarioMes } from "@/components/bona/calendario-mes";
import { CitasHoy } from "@/components/bona/citas-hoy";
import { AnilloProgreso, BarraProgreso } from "@/components/bona/progreso";
import { GraficaSemana } from "@/components/bona/grafica-semana";
import { Contador } from "@/components/bona/contador";
import { Avatar } from "@/components/bona/avatar";

export const metadata: Metadata = { title: "Resumen" };

export default async function PaginaResumen({ searchParams }: PageProps<"/resumen">) {
  const usuario = await requerirUsuario();
  const hoy = isoDia();
  const datos = await leer();
  const r = calcularResumen(hoy, datos, usuario.rol);
  const verCaja = puede(usuario.rol, "ver_caja");
  const ahora = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", minute: "2-digit" }).format(new Date());
  const pctMeta = r.metaMes.meta > 0 ? (r.metaMes.logrado / r.metaMes.meta) * 100 : 0;
  const sinPermiso = (await searchParams)["sin-permiso"];

  return (
    <>
      {sinPermiso && (
        <p role="alert" className="rounded-card bg-danger/12 px-4 py-3 text-sm text-danger">Tu rol no tiene acceso a esa sección.</p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Aparecer orden={0} className="h-full min-w-0">
          <TarjetaMetricas titulo={r.grupo} periodo={mayuscula(nombreMes(hoy))} metricas={r.metricas} />
        </Aparecer>
        <Aparecer orden={1}>
          <CalendarioMes hoy={hoy} citasPorDia={r.citasPorDia} />
        </Aparecer>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Aparecer orden={2} className="card lift flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Confirmadas hoy</h2>
              <p className="text-sm text-muted">
                {r.citasHoy.length - r.confirmadasHoy > 0 ? `Faltan ${r.citasHoy.length - r.confirmadasHoy} por confirmar` : "¡Todas confirmadas!"}
              </p>
              <p className="mt-4 text-xs text-faint">El bot confirma por WhatsApp a las 7:45 a. m.</p>
            </div>
            <AnilloProgreso valor={r.confirmadasHoy} total={r.citasHoy.length} centro={`${r.confirmadasHoy}/${r.citasHoy.length}`} />
          </Aparecer>

          {verCaja ? (
            <Aparecer orden={3} className="card lift flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Meta de ingresos</h2>
                <span className="text-xs text-muted"><Contador valor={pctMeta} formato="porcentaje" className="font-bold text-ink" /> logrado</span>
              </div>
              <BarraProgreso pct={pctMeta} />
              <div className="flex justify-between text-sm tabular-nums">
                <span>{RD(r.metaMes.logrado)}</span>
                <span className="text-muted">{RD(r.metaMes.meta)}</span>
              </div>
            </Aparecer>
          ) : (
            <Aparecer orden={3} className="card lift flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Tu próxima cita</h2>
              {(() => {
                const sig = r.citasHoy.find((x) => x.cita.hora >= ahora);
                return sig ? (
                  <div className="flex items-center gap-3">
                    <Avatar nombre={sig.paciente?.nombre ?? "Paciente"} className="size-11" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{sig.paciente?.nombre}</p>
                      <p className="truncate text-sm text-muted">{sig.cita.tratamiento} · {hora12(sig.cita.hora)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted">No quedan citas hoy. ¡Buen trabajo!</p>
                );
              })()}
            </Aparecer>
          )}

        {(() => {
          const reponer = porReponer(datos.articulos);
          if (!reponer.length) return null;
          return (
            <Aparecer orden={3} className="card lift flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Package className="size-5 text-warn" /> Por reponer</h2>
                <Link href="/inventario" className="rounded-chip bg-raised px-3 py-1 text-xs font-semibold hover:bg-lime hover:text-on-lime">Inventario</Link>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {reponer.slice(0, 5).map((a) => (
                  <li key={a.id} className={estadoStock(a) === "agotado" ? "rounded-chip bg-danger/15 px-3 py-1 text-xs font-semibold text-danger" : "rounded-chip bg-warn/15 px-3 py-1 text-xs font-semibold text-warn"}>
                    {a.nombre} · {a.cantidad}
                  </li>
                ))}
                {reponer.length > 5 && <li className="px-1 py-1 text-xs text-muted">+{reponer.length - 5} más</li>}
              </ul>
            </Aparecer>
          );
        })()}
        </div>
        <Aparecer orden={4}>
          <CitasHoy citas={r.citasHoy} ahora={ahora} />
        </Aparecer>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Aparecer orden={5} className="card lift flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recordatorios por enviar</h2>
            <Link href="/recordatorios" aria-label="Abrir recordatorios" className="grid size-9 place-items-center rounded-full bg-raised transition hover:rotate-45">
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          {r.recordatorios.length ? (
            <ul className="flex flex-col gap-2">
              {r.recordatorios.slice(0, 5).map((x) => (
                <li key={x.recordatorio.id} className="flex items-center gap-3 rounded-tile bg-raised px-3 py-2.5">
                  <BellRing className="size-4 shrink-0 text-lime" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm">{x.paciente?.nombre}</span>
                  <span className="shrink-0 rounded-chip bg-card px-2.5 py-0.5 text-xs text-muted">
                    {x.recordatorio.tipo === "hoy" ? "Mismo día" : `En ${x.dias} d`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-tile border-2 border-dashed border-hairline p-6 text-center text-sm text-muted">Todo enviado por hoy.</p>
          )}
        </Aparecer>

        {verCaja && (
          <Aparecer orden={6} className="card lift flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Últimos 7 días</h2>
              <span className="flex gap-3 text-xs text-muted">
                <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-lime" />Ingresos</span>
                <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-coral" />Egresos</span>
              </span>
            </div>
            <GraficaSemana datos={r.ultimos7} />
          </Aparecer>
        )}

        {verCaja && (
          <Aparecer orden={7} className="card lift flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">Por cobrar</h2>
              <Contador valor={r.porCobrar.total} formato="dinero" className="text-xl font-bold tabular-nums" />
            </div>
            {r.porCobrar.deudores.length ? (
              <ul className="flex flex-col gap-2">
                {r.porCobrar.deudores.slice(0, 4).map((d) => (
                  <li key={d.id} className="flex items-center gap-3">
                    <Avatar nombre={d.nombre} />
                    <span className="min-w-0 flex-1 truncate text-sm">{d.nombre}</span>
                    <span className="text-sm font-semibold tabular-nums text-coral">{RD(d.saldo)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-tile border-2 border-dashed border-hairline p-6 text-center text-sm text-muted">Nadie debe nada.</p>
            )}
            <p className="mt-auto text-xs text-faint">Actualizado {fechaCorta(hoy)}</p>
          </Aparecer>
        )}
      </div>
    </>
  );
}
