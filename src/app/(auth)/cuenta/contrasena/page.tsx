"use client";
import { useActionState } from "react";
import { guardarContrasena } from "@/lib/acciones-auth";
import { Aviso, BotonEnviar, Campo } from "@/components/ui/formulario";

/** Llega aquí desde el enlace de invitación o de recuperación. */
export default function PaginaContrasena() {
  const [estado, accion] = useActionState(guardarContrasena, undefined);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Crea tu contraseña</h1>
        <p className="text-sm text-muted">La usarás para entrar a la clínica desde cualquier equipo.</p>
      </div>
      <form action={accion} className="flex flex-col gap-4" noValidate>
        <Campo etiqueta="Contraseña nueva" name="contrasena" type="password" autoComplete="new-password" ayuda="Al menos 8 caracteres" required />
        <Campo etiqueta="Repítela" name="repetir" type="password" autoComplete="new-password" required />
        <Aviso error={estado?.error} />
        <BotonEnviar className="h-12">Guardar y entrar</BotonEnviar>
      </form>
    </div>
  );
}
