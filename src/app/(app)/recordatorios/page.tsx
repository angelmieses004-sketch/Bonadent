import type { Metadata } from "next";
import { Bot, Clock } from "lucide-react";
import { requerirUsuario } from "@/lib/sesion";
import { leer } from "@/datos/repo";
import { puede } from "@/lib/permisos";
import { diferenciaDias, fechaCorta, hora12, isoDia, sumarDias } from "@/lib/fechas";
import { esActiva, recordatoriosDelDia } from "@/lib/reglas/recordatorios";
import { enlaceWhatsApp, mensajeRecordatorio } from "@/lib/mensajes";
import { Aparecer } from "@/components/bona/aparecer";
import { Pestanas } from "@/components/ui/pestanas";
import { ListaRecordatorios, type FilaRecordatorio } from "./lista";

export const metadata: Metadata = { title: "Recordatorios" };

export default async function PaginaRecordatorios({ searchParams }: PageProps<"/recordatorios">) {
  const u = await requerirUsuario();
  const sp = await searchParams;
  const vista = (["enviar", "fallidos", "enviados", "proximos"] as const).find((v) => v === sp.ver) ?? "enviar";
  const hoy = isoDia();
  const d = await leer();
  const pac = new Map(d.pacientes.map((p) => [p.id, p]));
  const doc = new Map(d.doctores.map((x) => [x.id, x]));
  const cita = new Map(d.citas.map((c) => [c.id, c]));

  const fila = (r: (typeof d.recordatorios)[number], atrasado = false): FilaRecordatorio | null => {
    const c = cita.get(r.cita_id);
    if (!c) return null;
    const p = pac.get(c.paciente_id);
    const dr = c.doctor_id ? doc.get(c.doctor_id) : undefined;
    const dias = Math.max(0, diferenciaDias(r.estado === "pendiente" || r.estado === "fallido" ? hoy : r.fecha_envio, c.fecha));
    const mensaje = mensajeRecordatorio(r.tipo, dias, c, p, dr, d.clinica);
    return {
      id: r.id, tipo: r.tipo, estado: r.estado, canal: r.canal ?? null, error: r.ultimo_error ?? null, atrasado,
      paciente: p?.nombre ?? "Paciente", telefono: p?.telefono ?? null, cuando: `${fechaCorta(c.fecha)} · ${hora12(c.hora)}`,
      doctor: dr?.nombre ?? "", mensaje, enlace: enlaceWhatsApp(p?.telefono, mensaje), fechaCita: c.fecha,
    };
  };
  const ok = <T,>(x: T | null): x is T => x !== null;

  const delDia = recordatoriosDelDia(hoy, d.recordatorios, d.citas);
  const porEnviar = delDia.filter((x) => x.recordatorio.estado === "pendiente").map((x) => fila(x.recordatorio, x.atrasado)).filter(ok);
  const fallidos = delDia.filter((x) => x.recordatorio.estado === "fallido").map((x) => fila(x.recordatorio)).filter(ok);
  const enviados = d.recordatorios.filter((r) => r.estado === "enviado" && (r.enviado_en?.slice(0, 10) === hoy || r.fecha_envio === hoy)).map((r) => fila(r)).filter(ok);
  const proximos = d.recordatorios
    .filter((r) => r.estado === "pendiente" && r.fecha_envio > hoy && r.fecha_envio <= sumarDias(hoy, 7) && esActiva(cita.get(r.cita_id) ?? { estado: "cancelada" }))
    .sort((a, b) => a.fecha_envio.localeCompare(b.fecha_envio));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recordatorios</h2>
          <p className="max-w-2xl text-sm text-muted">Cada cita tiene dos avisos: 3 días antes y el mismo día. El bot de WhatsApp los envía cada mañana a las 7:45. Lo que quede aquí, envíalo a mano.</p>
        </div>
        <Pestanas grupo="rec" activo={vista} items={[
          { valor: "enviar", texto: "Por enviar", href: "/recordatorios?ver=enviar", cuenta: porEnviar.length },
          { valor: "fallidos", texto: "Fallidos", href: "/recordatorios?ver=fallidos", cuenta: fallidos.length },
          { valor: "enviados", texto: "Enviados hoy", href: "/recordatorios?ver=enviados", cuenta: enviados.length },
          { valor: "proximos", texto: "Próximos 7 días", href: "/recordatorios?ver=proximos", cuenta: proximos.length },
        ]} />
      </div>

      <Aparecer className="flex flex-wrap items-center gap-3 rounded-card bg-royal p-4 text-on-royal">
        <span className="grid size-11 place-items-center rounded-full bg-lime text-on-lime"><Bot className="size-5" /></span>
        <p className="min-w-0 flex-1 text-sm"><b>Bot de WhatsApp</b> · envía solo cada día a las 7:45 a. m. y marca cada aviso como enviado o fallido.</p>
        <span className="rounded-chip bg-white/15 px-3 py-1 text-xs">{d.recordatorios.filter((r) => r.estado === "enviado" && r.canal === "bot").length} enviados por el bot</span>
      </Aparecer>

      {vista === "enviar" && <ListaRecordatorios filas={porEnviar} puedeEnviar={puede(u.rol, "enviar_recordatorios")} vacio="Todo enviado por hoy" />}
      {vista === "fallidos" && <ListaRecordatorios filas={fallidos} puedeEnviar={puede(u.rol, "enviar_recordatorios")} vacio="Ningún envío falló" />}
      {vista === "enviados" && <ListaRecordatorios filas={enviados} puedeEnviar={puede(u.rol, "enviar_recordatorios")} vacio="Aún no se ha enviado nada hoy" />}
      {vista === "proximos" && (
        <Aparecer className="card flex flex-col gap-2">
          {proximos.length ? proximos.map((r) => {
            const c = cita.get(r.cita_id)!;
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-tile bg-raised p-3">
                <span className="flex w-24 items-center gap-1.5 text-sm font-semibold"><Clock className="size-4 text-lime" /> {fechaCorta(r.fecha_envio)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{pac.get(c.paciente_id)?.nombre} <span className="text-muted">· cita {fechaCorta(c.fecha)} {hora12(c.hora)}</span></span>
                <span className="rounded-chip bg-card px-2.5 py-1 text-xs text-muted">{r.tipo === "hoy" ? "Mismo día" : "3 días antes"}</span>
              </div>
            );
          }) : <p className="py-8 text-center text-sm text-muted">Nada programado esta semana.</p>}
        </Aparecer>
      )}
    </>
  );
}
