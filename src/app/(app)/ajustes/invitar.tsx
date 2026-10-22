"use client";
import { useActionState, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { UserPlus, X } from "lucide-react";
import { Aviso, BotonEnviar, Campo, Selector } from "@/components/ui/formulario";
import { invitarMiembro } from "./acciones";

/** Tarjeta punteada "+ Invitar" que abre el formulario en un diálogo. */
export function Invitar({ doctores }: { doctores: { id: string; nombre: string }[] }) {
  const [abierto, setAbierto] = useState(false);
  const [rol, setRol] = useState("recepcion");
  const [estado, accion] = useActionState(invitarMiembro, undefined);

  useEffect(() => {
    if (estado?.ok) {
      const t = setTimeout(() => setAbierto(false), 1400);
      return () => clearTimeout(t);
    }
  }, [estado]);

  return (
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
      <Dialog.Trigger asChild>
        <button className="group grid min-h-24 place-items-center rounded-tile border-2 border-dashed border-lime/50 p-4 text-sm text-muted transition duration-200 hover:border-lime hover:text-ink">
          <span className="flex items-center gap-2">
            <UserPlus className="size-5 transition-transform duration-300 group-hover:scale-110" /> Invitar a alguien del equipo
          </span>
        </button>
      </Dialog.Trigger>
      <AnimatePresence>
        {abierto && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-panel bg-shell p-6 shadow-lift sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2"
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <Dialog.Title className="text-xl font-bold">Invitar al equipo</Dialog.Title>
                    <Dialog.Description className="text-sm text-muted">Le llega un correo para crear su contraseña.</Dialog.Description>
                  </div>
                  <Dialog.Close aria-label="Cerrar" className="grid size-10 place-items-center rounded-full bg-card text-muted hover:text-ink">
                    <X className="size-4" />
                  </Dialog.Close>
                </div>
                <form action={accion} className="flex flex-col gap-4" noValidate>
                  <Campo etiqueta="Nombre" name="nombre" required placeholder="Dra. Carla Núñez" />
                  <Campo etiqueta="Correo" name="correo" type="email" required placeholder="carla@clinica.do" />
                  <Selector etiqueta="Rol" name="rol" value={rol} onChange={(e) => setRol(e.target.value)}>
                    <option value="recepcion">Recepción · agenda, caja y cotizaciones</option>
                    <option value="odontologo">Odontólogo · agenda, pacientes y radiografías</option>
                    <option value="admin">Administrador · todo</option>
                  </Selector>
                  {rol === "odontologo" && (
                    <Selector etiqueta="Su agenda" name="doctor_id" defaultValue="">
                      <option value="">Elegir odontólogo…</option>
                      {doctores.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </Selector>
                  )}
                  <Aviso error={estado?.error} ok={estado?.ok} />
                  <BotonEnviar className="h-12">Enviar invitación</BotonEnviar>
                </form>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
