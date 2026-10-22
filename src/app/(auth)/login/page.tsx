import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Stethoscope, ShieldCheck, Users } from "lucide-react";
import { supabaseConfigurado } from "@/lib/env";
import { entrarVistaPrevia } from "@/lib/acciones-auth";
import { obtenerUsuario } from "@/lib/sesion";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

const ROLES = [
  { rol: "admin", titulo: "Administrador", detalle: "Dra. Laura Peña · ve todo", icono: ShieldCheck },
  { rol: "odontologo", titulo: "Odontólogo", detalle: "Dr. Miguel Taveras · sin caja", icono: Stethoscope },
  { rol: "recepcion", titulo: "Recepción", detalle: "Carmen Reyes · sin radiografías", icono: Users },
] as const;

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  if (await obtenerUsuario()) redirect("/resumen");
  const sp = await searchParams;
  const volver = typeof sp.volver === "string" ? sp.volver : undefined;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-7">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-lime text-xl font-black text-on-lime">B</span>
        <div>
          <p className="text-2xl font-bold tracking-tight">Te damos la bienvenida</p>
          <p className="text-sm text-muted">Entra con el correo que te invitó la clínica.</p>
        </div>
      </div>

      {supabaseConfigurado ? (
        <FormularioLogin volver={volver} errorEnlace={sp.error === "enlace"} />
      ) : (
        <section className="flex flex-col gap-3" aria-labelledby="vp-titulo">
          <div className="rounded-tile bg-warn/12 px-4 py-3 text-sm text-warn">
            <b id="vp-titulo">Vista previa.</b> Supabase aún no está conectado: entras con <b>datos de ejemplo</b> que se guardan en memoria mientras el servidor esté encendido. Elige un rol para ver qué muestra la app a cada persona.
          </div>
          {ROLES.map(({ rol, titulo, detalle, icono: Icono }) => (
            <form key={rol} action={entrarVistaPrevia}>
              <input type="hidden" name="rol" value={rol} />
              <button className="group flex w-full items-center gap-4 rounded-card bg-card p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-raised">
                <span className="grid size-11 place-items-center rounded-full bg-raised text-lime transition group-hover:bg-lime group-hover:text-on-lime">
                  <Icono className="size-5" />
                </span>
                <span>
                  <b className="block">{titulo}</b>
                  <span className="text-sm text-muted">{detalle}</span>
                </span>
              </button>
            </form>
          ))}
        </section>
      )}
    </div>
  );
}
