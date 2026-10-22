import type { Metadata } from "next";
import { requerirUsuario } from "@/lib/sesion";
import { leer } from "@/datos/repo";
import { EditorCotizacion } from "../editor";

export const metadata: Metadata = { title: "Nueva cotización" };

export default async function NuevaCotizacion({ searchParams }: PageProps<"/cotizaciones/nueva">) {
  await requerirUsuario();
  const sp = await searchParams;
  const d = await leer();
  return (
    <>
      <h2 className="text-2xl font-bold tracking-tight">Nueva cotización</h2>
      <EditorCotizacion
        inicial={{ paciente_id: typeof sp.paciente === "string" ? sp.paciente : "", items: [], descuento_pct: 0, notas: "", origen: "manual" }}
        pacientes={d.pacientes}
        servicios={d.servicios.filter((s) => s.activo)}
      />
    </>
  );
}
