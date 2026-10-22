"use client";
import { useActionState } from "react";
import Link from "next/link";
import { iniciarSesion } from "@/lib/acciones-auth";
import { Aviso, BotonEnviar, Campo } from "@/components/ui/formulario";

export function FormularioLogin({ volver, errorEnlace }: { volver?: string; errorEnlace?: boolean }) {
  const [estado, accion] = useActionState(iniciarSesion, errorEnlace ? { error: "El enlace venció o ya se usó. Pide uno nuevo." } : undefined);
  return (
    <form action={accion} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="volver" value={volver ?? ""} />
      <Campo etiqueta="Correo" name="correo" type="email" autoComplete="email" inputMode="email" required placeholder="tu@clinica.do" />
      <Campo etiqueta="Contraseña" name="contrasena" type="password" autoComplete="current-password" required />
      <Aviso error={estado?.error} />
      <BotonEnviar className="mt-1 h-12">Entrar</BotonEnviar>
      <Link href="/recuperar" className="self-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}
