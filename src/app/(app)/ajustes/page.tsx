import type { Metadata } from "next";
import { requerirUsuario } from "@/lib/sesion";
import { NOMBRE_ROL, puede } from "@/lib/permisos";
import { cargarEquipo } from "@/datos/equipo";
import { leer, leerAuditoria } from "@/datos/repo";
import { Pestanas } from "@/components/ui/pestanas";
import { fechaCorta } from "@/lib/fechas";
import { Aparecer } from "@/components/bona/aparecer";
import { Avatar } from "@/components/bona/avatar";
import { cn } from "@/lib/utils";
import { alternarActivo, cambiarRol, cancelarInvitacion } from "./acciones";
import { Invitar } from "./invitar";
import { FormClinica, FormHorario, FormTextos, InterruptorIA, ListaDoctores, ListaServicios, ZonaEjemplo } from "./secciones";

export const metadata: Metadata = { title: "Ajustes" };


const TONO_ROL = { admin: "bg-lime text-on-lime", odontologo: "bg-royal text-on-royal", recepcion: "bg-raised text-ink" } as const;

const SECCIONES = [
  ["equipo", "Equipo"], ["clinica", "Clínica"], ["odontologos", "Odontólogos"], ["servicios", "Catálogo"],
  ["horario", "Horario"], ["textos", "Recordatorios"], ["ia", "IA"], ["actividad", "Actividad"], ["ejemplo", "Datos de ejemplo"],
] as const;
const ACCION = { crear: "creó", editar: "editó", borrar: "borró", ver: "vio" } as const;

export default async function PaginaAjustes({ searchParams }: PageProps<"/ajustes">) {
  const usuario = await requerirUsuario();
  const admin = puede(usuario.rol, "gestionar_equipo");
  const sp = await searchParams;
  const tab = SECCIONES.find(([v]) => v === sp.tab)?.[0] ?? "equipo";
  const d = await leer();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Ajustes</h2>
        {admin && <Pestanas grupo="ajustes" activo={tab} items={SECCIONES.map(([v, t]) => ({ valor: v, texto: t, href: `/ajustes?tab=${v}` }))} />}
      </div>
      {tab === "equipo" || !admin ? <Equipo usuario={usuario} admin={admin} /> : (
        <Aparecer key={tab} className="card mx-auto flex w-full max-w-4xl flex-col gap-5 sm:p-7">
          <h3 className="text-lg font-semibold">{SECCIONES.find(([v]) => v === tab)?.[1]}</h3>
          {tab === "clinica" && <FormClinica clinica={d.clinica} />}
          {tab === "odontologos" && <ListaDoctores doctores={d.doctores} />}
          {tab === "servicios" && <ListaServicios servicios={[...d.servicios].sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre))} />}
          {tab === "horario" && <FormHorario horario={d.clinica.horario} />}
          {tab === "textos" && <FormTextos textos={d.clinica.textos_recordatorio} clinica={d.clinica.nombre} />}
          {tab === "ia" && <InterruptorIA activa={d.clinica.ia_sugerencias} />}
          {tab === "ejemplo" && <ZonaEjemplo vistaPrevia={usuario.vistaPrevia} />}
          {tab === "actividad" && <Actividad />}
        </Aparecer>
      )}
    </>
  );
}

async function Actividad() {
  const log = await leerAuditoria(60);
  if (!log.length) return <p className="py-6 text-center text-sm text-muted">Todavía no hay actividad registrada.</p>;
  return (
    <ol className="flex flex-col gap-1.5">
      {log.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-tile bg-raised px-3 py-2.5 text-sm">
          <span className="w-24 shrink-0 text-xs tabular-nums text-muted">{fechaCorta(a.en.slice(0, 10))} {new Date(a.en).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santo_Domingo" })}</span>
          <span className="min-w-0 flex-1 truncate"><b>{a.quien}</b> {ACCION[a.accion]} <span className="text-muted">{a.tabla.replace(/_/g, " ")}</span></span>
          {a.accion === "ver" && <span className="rounded-chip bg-info/15 px-2 py-0.5 text-xs text-info">acceso</span>}
        </li>
      ))}
    </ol>
  );
}

async function Equipo({ usuario, admin }: { usuario: Awaited<ReturnType<typeof requerirUsuario>>; admin: boolean }) {
  const { miembros, invitaciones, doctores } = await cargarEquipo();
  return (
    <div className="mx-auto w-full max-w-4xl">
      <Aparecer className="card flex flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Equipo y roles</h2>
            <p className="text-sm text-muted">{miembros.filter((m) => m.activo).length} personas con acceso</p>
          </div>
        </header>

        <div className="flex flex-col gap-2">
          {miembros.map((m, i) => (
            <Aparecer key={m.id} orden={i} className={cn("flex flex-wrap items-center gap-3 rounded-tile bg-raised p-3", !m.activo && "opacity-55")}>
              <Avatar nombre={m.nombre} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.nombre}{m.id === usuario.id && <span className="ml-2 text-xs font-normal text-muted">(tú)</span>}</p>
                <p className="truncate text-sm text-muted">{m.correo}{m.doctor && m.rol === "odontologo" ? ` · agenda de ${m.doctor}` : ""}</p>
              </div>
              {admin && m.id !== usuario.id && !usuario.vistaPrevia ? (
                <div className="flex items-center gap-2">
                  <form action={cambiarRol} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <label className="sr-only" htmlFor={`rol-${m.id}`}>Rol de {m.nombre}</label>
                    <select id={`rol-${m.id}`} name="rol" defaultValue={m.rol} className="h-10 rounded-chip bg-card px-3 text-sm">
                      {Object.entries(NOMBRE_ROL).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                    </select>
                    <button className="h-10 rounded-chip bg-card px-3 text-sm text-muted hover:text-ink">Guardar</button>
                  </form>
                  <form action={alternarActivo}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className={cn("h-10 rounded-chip px-3 text-sm", m.activo ? "text-danger hover:bg-danger/10" : "text-ok hover:bg-ok/10")}>
                      {m.activo ? "Quitar acceso" : "Devolver acceso"}
                    </button>
                  </form>
                </div>
              ) : (
                <span className={cn("rounded-chip px-3 py-1 text-xs font-semibold", TONO_ROL[m.rol])}>{NOMBRE_ROL[m.rol]}</span>
              )}
            </Aparecer>
          ))}
        </div>

        {invitaciones.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted">Invitaciones pendientes</h3>
            {invitaciones.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center gap-3 rounded-tile border-2 border-dashed border-hairline p-3">
                <Avatar nombre={inv.nombre} className="size-11 opacity-70" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{inv.nombre}</p>
                  <p className="truncate text-sm text-muted">{inv.correo} · {NOMBRE_ROL[inv.rol]}</p>
                </div>
                {admin && !usuario.vistaPrevia && (
                  <form action={cancelarInvitacion}>
                    <input type="hidden" name="id" value={inv.id} />
                    <button className="h-10 rounded-chip px-3 text-sm text-danger hover:bg-danger/10">Cancelar</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        {admin && <Invitar doctores={doctores} />}
        {!admin && <p className="text-sm text-muted">Solo el administrador puede invitar o cambiar roles.</p>}
      </Aparecer>

    </div>
  );
}
