"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { LayoutGrid, LogOut, Plus, type LucideIcon } from "lucide-react";
import type { Rol } from "@/tipos";
import { cn } from "@/lib/utils";
import { Dialogo } from "@/components/ui/dialogo";

interface Item { href: string; texto: string; icono: LucideIcon }

const CORTO: Record<string, string> = {
  "/resumen": "Inicio", "/agenda": "Agenda", "/pacientes": "Pacientes", "/caja": "Caja",
  "/cotizaciones": "Cotizar", "/recordatorios": "Avisos", "/demo": "Demo bot", "/ajustes": "Ajustes", "/inventario": "Inventario",
};

/**
 * Celular: barra inferior con 4 secciones + "Más" (hoja con el resto y cerrar sesión),
 * y un botón flotante para crear cita. Botones de 48 px con etiqueta bajo el ícono.
 */
export function NavMovil({ items, rol, cerrarSesion }: { items: Item[]; rol: Rol; cerrarSesion: () => Promise<void> }) {
  const ruta = usePathname();
  const [mas, setMas] = useState(false);
  const activo = (href: string) => ruta === href || ruta.startsWith(`${href}/`);
  const cuarta = rol === "odontologo" ? "/cotizaciones" : "/caja";
  const principales = ["/resumen", "/agenda", "/pacientes", cuarta].map((h) => items.find((i) => i.href === h)).filter(Boolean) as Item[];
  const resto = items.filter((i) => !principales.includes(i));
  const enResto = resto.some((i) => activo(i.href));

  return (
    <>
      {(ruta === "/resumen" || ruta === "/pacientes") && (
        <Link
          href="/agenda?nueva=1"
          aria-label="Nueva cita"
          className="fixed right-4 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.25rem)] z-40 grid size-14 place-items-center rounded-full bg-royal text-on-royal shadow-lift transition active:scale-95 md:hidden"
        >
          <Plus className="size-6" />
        </Link>
      )}

      <nav aria-label="Principal" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden">
        <div className="grid grid-cols-5 gap-1 rounded-[26px] bg-card/95 p-1.5 shadow-lift ring-1 ring-hairline backdrop-blur">
          {principales.map((i) => <Boton key={i.href} item={i} activo={activo(i.href)} />)}
          <button
            onClick={() => setMas(true)}
            aria-label="Más secciones"
            className={cn("relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[0.68rem] font-semibold", enResto ? "text-on-lime" : "text-muted")}
          >
            {enResto && <motion.span layoutId="nav-movil" className="absolute inset-0 rounded-[20px] bg-lime" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
            <LayoutGrid className="relative size-5" />
            <span className="relative">Más</span>
          </button>
        </div>
      </nav>

      <Dialogo abierto={mas} onCambio={setMas} titulo="Más secciones">
        <div className="grid grid-cols-3 gap-2">
          {resto.map((i) => {
            const Icono = i.icono;
            return (
              <Link key={i.href} href={i.href} onClick={() => setMas(false)}
                className={cn("flex aspect-square flex-col items-center justify-center gap-2 rounded-card text-sm font-semibold transition active:scale-95", activo(i.href) ? "bg-lime text-on-lime" : "bg-card")}>
                <Icono className="size-6" />
                {CORTO[i.href] ?? i.texto}
              </Link>
            );
          })}
          <form action={cerrarSesion} className="contents">
            <button className="flex aspect-square flex-col items-center justify-center gap-2 rounded-card bg-card text-sm font-semibold text-danger transition active:scale-95">
              <LogOut className="size-6" /> Salir
            </button>
          </form>
        </div>
      </Dialogo>
    </>
  );
}

function Boton({ item, activo }: { item: Item; activo: boolean }) {
  const Icono = item.icono;
  return (
    <Link
      href={item.href}
      aria-current={activo ? "page" : undefined}
      className={cn("relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[0.68rem] font-semibold transition-colors", activo ? "text-on-lime" : "text-muted")}
    >
      {activo && <motion.span layoutId="nav-movil" className="absolute inset-0 rounded-[20px] bg-lime" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
      <Icono className="relative size-5" />
      <span className="relative">{CORTO[item.href] ?? item.texto}</span>
    </Link>
  );
}
