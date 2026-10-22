import type { Metadata } from "next";
import { requerirUsuario } from "@/lib/sesion";
import { leer } from "@/datos/repo";
import { isoDia } from "@/lib/fechas";
import { TableroAgenda, type Vista } from "./tablero";

export const metadata: Metadata = { title: "Agenda" };

const texto = (v: unknown) => (typeof v === "string" ? v : undefined);

export default async function PaginaAgenda({ searchParams }: PageProps<"/agenda">) {
  const u = await requerirUsuario();
  const sp = await searchParams;
  const hoy = isoDia();
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(texto(sp.fecha) ?? "") ? texto(sp.fecha)! : hoy;
  const vista: Vista = (["dia", "semana", "mes"] as const).find((v) => v === sp.vista) ?? "dia";
  const d = await leer();
  const activos = d.doctores.filter((x) => x.activo);

  const nueva = sp.nueva
    ? {
        fecha,
        hora: "09:00",
        duracion_min: 30,
        cada_dias: 0,
        paciente_id: texto(sp.paciente),
        tratamiento: texto(sp.tratamiento),
        doctor_id: texto(sp.doctor) ?? (u.rol === "odontologo" ? u.doctorId ?? undefined : undefined),
        pieza_fdi: sp.pieza ? Number(sp.pieza) : null,
      }
    : null;

  return (
    <TableroAgenda
      vista={vista}
      fecha={fecha}
      hoy={hoy}
      citas={d.citas}
      pacientes={d.pacientes}
      doctores={activos}
      servicios={d.servicios.filter((s) => s.activo)}
      rol={u.rol}
      miDoctor={u.doctorId}
      nueva={nueva}
    />
  );
}
