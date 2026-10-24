import { cookies } from "next/headers";
import { requerirUsuario } from "@/lib/sesion";
import { cerrarSesion } from "@/lib/acciones-auth";
import { BarraLateral } from "@/components/bona/barra-lateral";
import { Encabezado } from "@/components/bona/encabezado";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const usuario = await requerirUsuario();
  const tema = (await cookies()).get("bona_tema")?.value === "light" ? "light" : "dark";

  return (
    <div className="min-h-dvh md:p-3 lg:p-4">
      <div className="mx-auto flex min-h-dvh max-w-[1560px] gap-2 bg-shell md:min-h-[calc(100dvh-1.5rem)] md:rounded-panel md:pr-3 lg:min-h-[calc(100dvh-2rem)] lg:pr-5">
        <BarraLateral rol={usuario.rol} nombre={usuario.nombre} cerrarSesion={cerrarSesion} />
        <div className="flex min-w-0 flex-1 flex-col gap-4 px-3.5 pt-[max(0.9rem,env(safe-area-inset-top))] pb-32 sm:px-4 md:gap-5 md:px-0 md:pt-5 md:pb-6">
          {usuario.vistaPrevia && (
            <p className="self-start rounded-chip bg-warn/12 px-3 py-1 text-[0.7rem] font-medium text-warn md:text-xs">
              Vista previa · datos de ejemplo<span className="hidden sm:inline"> en memoria (se reinician al apagar el servidor)</span>
            </p>
          )}
          <Encabezado usuario={usuario} tema={tema} />
          <main id="contenido" className="flex min-w-0 flex-col gap-4 md:gap-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
