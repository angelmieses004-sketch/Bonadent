import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { datosDeEjemplo } from "@/datos/ejemplo";
import { isoDia, sumarDias } from "@/lib/fechas";
import { obtenerUsuario } from "@/lib/sesion";
import { Aparecer } from "@/components/bona/aparecer";
import { EscenarioBot, FlujoDiario, type DatosDemo } from "./escenario";

export const metadata: Metadata = {
  title: "Demostración del bot de WhatsApp",
  description: "Cómo el asistente de WhatsApp recuerda cada cita y actualiza la agenda solo.",
};

/** Página pública (sin iniciar sesión) con datos ficticios, para presentar al cliente. */
export default async function Demo() {
  const usuario = await obtenerUsuario();
  const hoy = isoDia();
  const ej = datosDeEjemplo(hoy);
  const fecha = sumarDias(hoy, 3);
  const libres: DatosDemo["libres"] = [];
  for (let i = 1; libres.length < 3 && i < 14; i++) {
    const f = sumarDias(fecha, i);
    if (new Date(`${f}T12:00:00Z`).getUTCDay() === 0) continue;
    libres.push({ fecha: f, hora: ["09:00", "10:30", "15:30"][libres.length] });
  }
  const datos: DatosDemo = {
    hoy, paciente: ej.pacientes[0].nombre, telefono: ej.pacientes[0].telefono ?? "", doctor: ej.doctores[0].nombre,
    tratamiento: "Control de brackets", hora: "09:00", clinica: ej.clinica.nombre, direccion: ej.clinica.direccion ?? "", libres,
  };

  return (
    <div className="min-h-dvh p-3 md:p-5">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 rounded-panel bg-shell p-4 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-lime text-lg font-black text-on-lime">B</span>
            <span className="font-semibold">Bonadent</span>
          </span>
          {usuario && <Link href="/resumen" className="flex h-11 items-center gap-2 rounded-chip bg-card px-4 text-sm font-semibold"><ArrowLeft className="size-4" /> Volver al CRM</Link>}
        </div>

        <Aparecer className="flex max-w-3xl flex-col gap-3">
          <span className="self-start rounded-chip bg-lime px-3 py-1 text-xs font-bold text-on-lime">Demostración</span>
          <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">Su asistente de WhatsApp le recuerda cada cita al paciente, solo</h1>
          <p className="text-lg text-muted">Todos los días el bot revisa la agenda y le escribe a cada paciente 3 días antes y el mismo día de su cita. El paciente confirma o cambia la cita con un toque, y la agenda se actualiza sola.</p>
        </Aparecer>

        <Aparecer orden={1} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Cada mañana, sin que nadie toque nada</h2>
          <FlujoDiario />
        </Aparecer>

        <EscenarioBot d={datos} />

        <Aparecer orden={2} className="grid gap-3 rounded-card bg-royal p-5 text-on-royal sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Menos sillas vacías", "Cada paciente recibe dos avisos y puede confirmar o mover su cita en segundos."],
            ["Recepción libre", "Nadie tiene que escribir ni llamar paciente por paciente."],
            ["Agenda siempre al día", "Lo que responde el paciente se refleja solo en la agenda."],
            ["Imagen profesional", "Mensajes oficiales con el nombre de la clínica, a cualquier hora."],
          ].map(([t, s]) => (
            <div key={t} className="flex flex-col gap-1 border-t-4 border-lime pt-3">
              <b>{t}</b>
              <span className="text-sm text-white/75">{s}</span>
            </div>
          ))}
        </Aparecer>
      </main>
    </div>
  );
}
