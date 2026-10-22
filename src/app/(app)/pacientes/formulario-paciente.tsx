"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialogo } from "@/components/ui/dialogo";
import { Aviso, AreaTexto, BotonEnviar, Campo, Selector } from "@/components/ui/formulario";
import { avisar } from "@/components/ui/avisos";
import type { Doctor, Paciente } from "@/tipos";
import { guardarPaciente } from "./acciones";

/** Crear o editar paciente en un diálogo. Sin `paciente` muestra la tarjeta punteada "+ Paciente". */
export function FormularioPaciente({ paciente, doctores, disparador, irAFicha = false }: {
  paciente?: Paciente;
  doctores: Doctor[];
  disparador?: React.ReactNode;
  irAFicha?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();
  const [estado, accion] = useActionState(async (prev: Awaited<ReturnType<typeof guardarPaciente>>, fd: FormData) => {
    const r = await guardarPaciente(prev, fd);
    if (r.ok) {
      avisar(r.ok);
      setAbierto(false);
      if (irAFicha && r.id && !paciente) router.push(`/pacientes/${r.id}`);
    }
    return r;
  }, {});

  return (
    <Dialogo
      abierto={abierto}
      onCambio={setAbierto}
      titulo={paciente ? "Editar paciente" : "Nuevo paciente"}
      descripcion="El WhatsApp se usa para los recordatorios de citas."
      disparador={
        disparador ?? (
          <button className="group grid min-h-40 place-items-center rounded-card border-2 border-dashed border-lime/50 p-4 text-sm text-muted transition duration-200 hover:border-lime hover:text-ink">
            <span className="flex flex-col items-center gap-2">
              <Plus className="size-7 transition-transform duration-300 group-hover:rotate-90" /> Agregar paciente
            </span>
          </button>
        )
      }
    >
      <form action={accion} className="grid gap-4 sm:grid-cols-2" noValidate>
        <input type="hidden" name="id" value={paciente?.id ?? ""} />
        <Campo etiqueta="Nombre completo" name="nombre" defaultValue={paciente?.nombre} required className="sm:col-span-2" autoComplete="off" />
        <Campo etiqueta="WhatsApp" name="telefono" defaultValue={paciente?.telefono ?? ""} inputMode="tel" placeholder="809-000-0000" />
        <Campo etiqueta="Fecha de nacimiento" name="fecha_nacimiento" type="date" defaultValue={paciente?.fecha_nacimiento ?? ""} />
        <Campo etiqueta="Alergias" name="alergias" defaultValue={paciente?.alergias ?? ""} placeholder="Ej.: penicilina" />
        <Selector etiqueta="Odontólogo de cabecera" name="doctor_principal_id" defaultValue={paciente?.doctor_principal_id ?? ""}>
          <option value="">Sin asignar</option>
          {doctores.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </Selector>
        <AreaTexto etiqueta="Notas" name="notas" defaultValue={paciente?.notas ?? ""} className="sm:col-span-2" placeholder="Ej.: brackets, control cada 15 días" />
        <div className="sm:col-span-2"><Aviso error={estado?.error} /></div>
        <BotonEnviar className="h-12 sm:col-span-2">{paciente ? "Guardar cambios" : "Crear paciente"}</BotonEnviar>
      </form>
    </Dialogo>
  );
}
