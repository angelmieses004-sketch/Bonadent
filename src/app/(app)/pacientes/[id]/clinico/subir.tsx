"use client";
import { useActionState, useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { isoDia } from "@/lib/fechas";
import type { Doctor } from "@/tipos";
import { Dialogo } from "@/components/ui/dialogo";
import { Aviso, BotonEnviar, Campo, Selector } from "@/components/ui/formulario";
import { avisar } from "@/components/ui/avisos";
import { subirPanoramica } from "./acciones";

/** Tarjeta punteada "+ Subir panorámica". Acepta JPG/PNG exportados del equipo de rayos X. */
export function SubirPanoramica({ pacienteId, doctores, doctorPorDefecto }: { pacienteId: string; doctores: Doctor[]; doctorPorDefecto: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<string | null>(null);
  const [estado, accion] = useActionState(async (prev: Awaited<ReturnType<typeof subirPanoramica>>, fd: FormData) => {
    const r = await subirPanoramica(prev, fd);
    if (r?.ok) { avisar(r.ok); setAbierto(false); setVista(null); }
    return r;
  }, undefined);
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);

  return (
    <Dialogo
      abierto={abierto}
      onCambio={setAbierto}
      titulo="Subir panorámica"
      descripcion="Se guarda en almacenamiento privado. Solo administradores y odontólogos pueden verla."
      disparador={
        <button className="group grid min-h-28 w-full place-items-center rounded-card border-2 border-dashed border-lime/50 p-4 text-sm text-muted transition hover:border-lime hover:text-ink">
          <span className="flex flex-col items-center gap-2"><Upload className="size-6 transition-transform duration-300 group-hover:-translate-y-1" /> Subir panorámica</span>
        </button>
      }
    >
      <form action={accion} className="grid gap-4 sm:grid-cols-2" noValidate>
        <input type="hidden" name="paciente_id" value={pacienteId} />
        <label className="relative grid min-h-36 cursor-pointer place-items-center overflow-hidden rounded-card border-2 border-dashed border-hairline bg-sunken text-center text-sm text-muted transition hover:border-lime sm:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local antes de subir */}
          {vista ? <img src={vista} alt="Vista previa" className="absolute inset-0 size-full object-contain" /> : <span className="flex flex-col items-center gap-2 p-4"><Upload className="size-6" /> Toca para elegir la imagen (JPG o PNG)</span>}
          <input
            name="archivo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; setVista(f ? URL.createObjectURL(f) : null); }}
          />
        </label>
        <Campo etiqueta="Fecha en que se tomó" name="tomada_en" type="date" defaultValue={isoDia()} required />
        <Selector etiqueta="Odontólogo" name="doctor_id" defaultValue={doctorPorDefecto ?? ""}>
          <option value="">—</option>
          {doctores.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </Selector>
        <Campo etiqueta="Nota" name="nota" placeholder="Ej.: control a los 6 meses" className="sm:col-span-2" />
        <div className="sm:col-span-2"><Aviso error={estado?.error} /></div>
        <BotonEnviar className="h-12 sm:col-span-2">Subir</BotonEnviar>
      </form>
    </Dialogo>
  );
}
