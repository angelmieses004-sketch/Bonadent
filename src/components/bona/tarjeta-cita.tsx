"use client";
import { useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Check, CheckCheck, Clock, MessageCircle, Repeat, Wallet } from "lucide-react";
import { hora12 } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import type { Cita, Doctor, Paciente, Rol } from "@/tipos";
import { Menu } from "@/components/ui/menu";
import { ejecutar } from "@/components/ui/avisos";
import { cambiarEstadoCita, completarCita, eliminarCita } from "@/app/(app)/agenda/acciones";
import { Avatar } from "./avatar";
import { ESTADO_CITA } from "@/lib/estados";


/** Tarjeta de cita para la agenda: hora grande, paciente, estado y acciones. */
export function TarjetaCita({ cita, paciente, doctor, rol, onEditar, onAplazar, compacta }: {
  cita: Cita;
  paciente?: Paciente;
  doctor?: Doctor;
  rol: Rol;
  onEditar: (c: Cita) => void;
  onAplazar: (c: Cita) => void;
  compacta?: boolean;
}) {
  const [pendiente, iniciar] = useTransition();
  const activa = ["programada", "confirmada", "aplazada"].includes(cita.estado);
  const est = ESTADO_CITA[cita.estado];
  const accion = (fn: () => Promise<{ error?: string; ok?: string } | undefined>) => iniciar(() => ejecutar(fn));

  const opciones = [
    ...(activa ? [{ texto: "Aplazar", onSelect: () => onAplazar(cita) }, { texto: "Cancelar cita", onSelect: () => accion(() => cambiarEstadoCita(cita.id, "cancelada")), peligro: true }] : []),
    { texto: "Editar", onSelect: () => onEditar(cita) },
    ...(cita.estado === "cancelada" ? [{ texto: "Reactivar", onSelect: () => accion(() => cambiarEstadoCita(cita.id, "programada")) }] : []),
    ...(rol !== "odontologo" ? [{ texto: "Eliminar", onSelect: () => accion(() => eliminarCita(cita.id)), peligro: true }] : []),
  ];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: pendiente ? 0.55 : cita.estado === "cancelada" ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn("relative flex flex-col gap-3 overflow-hidden rounded-tile bg-raised p-3.5 pl-5 transition-shadow hover:shadow-lift", compacta && "gap-2 p-2.5 pl-4")}
    >
      <span className={cn("absolute inset-y-3 left-2 w-1 rounded-full", est.barra)} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("font-bold whitespace-nowrap tabular-nums", compacta ? "text-base" : "text-xl")}>{hora12(cita.hora)}</p>
          <p className="flex flex-wrap items-center gap-1 text-xs whitespace-nowrap text-muted">
            <Clock className="size-3" aria-hidden /> {cita.duracion_min} min
            {cita.cada_dias > 0 && <><Repeat className="ml-1 size-3" aria-hidden /> cada {cita.cada_dias} d</>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("rounded-chip px-2.5 py-1 text-[0.7rem] font-semibold", est.clase)}>{est.texto}</span>
          <Menu etiqueta={`Acciones de la cita de ${paciente?.nombre ?? "paciente"}`} opciones={opciones} />
        </div>
      </div>

      <Link href={`/pacientes/${cita.paciente_id}`} className="group flex min-w-0 items-center gap-2.5">
        <Avatar nombre={paciente?.nombre ?? "Paciente"} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold group-hover:underline">{paciente?.nombre ?? "Paciente"}</p>
          <p className="truncate text-xs text-muted">{cita.tratamiento}{!compacta && doctor ? ` · ${doctor.nombre}` : ""}</p>
        </div>
      </Link>

      {!compacta && (
        <div className="flex flex-wrap gap-1.5">
          {activa && cita.estado !== "confirmada" && (
            <button onClick={() => accion(() => cambiarEstadoCita(cita.id, "confirmada"))} className="flex min-h-9 items-center gap-1.5 rounded-chip bg-card px-3 text-xs font-semibold transition hover:bg-ok/15 hover:text-ok">
              <Check className="size-3.5" /> Confirmar
            </button>
          )}
          {activa && (
            <button onClick={() => accion(() => completarCita(cita.id))} className="flex min-h-9 items-center gap-1.5 rounded-chip bg-card px-3 text-xs font-semibold transition hover:bg-lime hover:text-on-lime">
              <CheckCheck className="size-3.5" /> Completar
            </button>
          )}
          {cita.estado === "completada" && rol !== "odontologo" && (
            <Link href={`/caja?nuevo=ingreso&paciente=${cita.paciente_id}&concepto=${encodeURIComponent(cita.tratamiento ?? "")}`} className="flex min-h-9 items-center gap-1.5 rounded-chip bg-card px-3 text-xs font-semibold transition hover:bg-lime hover:text-on-lime">
              <Wallet className="size-3.5" /> Cobrar
            </Link>
          )}
          {paciente?.telefono && activa && (
            <a href={`https://wa.me/1${paciente.telefono.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener" aria-label="Escribir por WhatsApp" className="grid size-9 place-items-center rounded-full bg-card text-muted transition hover:text-ok">
              <MessageCircle className="size-3.5" />
            </a>
          )}
        </div>
      )}
    </motion.article>
  );
}
