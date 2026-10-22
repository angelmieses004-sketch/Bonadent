"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pedirRecuperacion } from "@/lib/acciones-auth";
import { Aviso, BotonEnviar, Campo } from "@/components/ui/formulario";

export default function PaginaRecuperar() {
  const [estado, accion] = useActionState(pedirRecuperacion, undefined);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <Link href="/login" className="inline-flex items-center gap-2 self-start text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Volver
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">¿Olvidaste tu contraseña?</h1>
        <p className="text-sm text-muted">Te enviamos un enlace para crear una nueva.</p>
      </div>
      <form action={accion} className="flex flex-col gap-4" noValidate>
        <Campo etiqueta="Correo" name="correo" type="email" autoComplete="email" required />
        <Aviso error={estado?.error} ok={estado?.ok} />
        <BotonEnviar className="h-12">Enviar enlace</BotonEnviar>
      </form>
    </div>
  );
}
