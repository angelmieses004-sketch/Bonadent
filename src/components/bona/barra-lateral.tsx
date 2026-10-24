"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { BellRing, CalendarDays, FileText, House, LogOut, MessageCircle, Package, Settings, Users, Wallet, type LucideIcon } from "lucide-react";
import type { Rol } from "@/tipos";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { NavMovil } from "./nav-movil";

interface Item { href: string; texto: string; icono: LucideIcon; roles?: Rol[] }

export const NAVEGACION: Item[] = [
  { href: "/resumen", texto: "Resumen", icono: House },
  { href: "/agenda", texto: "Agenda", icono: CalendarDays },
  { href: "/pacientes", texto: "Pacientes", icono: Users },
  { href: "/recordatorios", texto: "Recordatorios", icono: BellRing },
  { href: "/caja", texto: "Caja", icono: Wallet, roles: ["admin", "recepcion"] },
  { href: "/cotizaciones", texto: "Cotizaciones", icono: FileText },
  { href: "/inventario", texto: "Inventario", icono: Package },
  { href: "/demo", texto: "Demostración del bot", icono: MessageCircle },
  { href: "/ajustes", texto: "Ajustes", icono: Settings },
];

function BotonNav({ item, activo, movil }: { item: Item; activo: boolean; movil?: boolean }) {
  const Icono = item.icono;
  const boton = (
    <Link
      href={item.href}
      aria-label={item.texto}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "relative grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-200",
        activo ? "text-on-lime" : "text-muted hover:bg-white/5 hover:text-ink",
      )}
    >
      {activo && (
        <motion.span
          layoutId={movil ? "nav-activo-movil" : "nav-activo"}
          className="absolute inset-0 rounded-full bg-lime shadow-glow"
          transition={{ type: "spring", stiffness: 460, damping: 32 }}
        />
      )}
      <Icono className="relative size-[1.15rem]" strokeWidth={2} />
    </Link>
  );
  if (movil) return boton;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{boton}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="right" sideOffset={10} className="rounded-chip bg-ink px-3 py-1.5 text-xs font-semibold text-shell shadow-lift">
          {item.texto}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function BarraLateral({ rol, nombre, cerrarSesion }: { rol: Rol; nombre: string; cerrarSesion: () => Promise<void> }) {
  const ruta = usePathname();
  const items = NAVEGACION.filter((i) => !i.roles || i.roles.includes(rol));
  const activo = (href: string) => ruta === href || ruta.startsWith(`${href}/`);

  return (
    <>
      {/* Computadora y tableta: columna angosta con píldoras */}
      <nav aria-label="Principal" className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-[84px] shrink-0 flex-col items-center justify-between py-6 md:flex">
        <Link href="/resumen" aria-label="Bonadent, inicio" className="grid size-11 place-items-center rounded-2xl bg-lime text-lg font-black text-on-lime transition-transform duration-300 hover:rotate-[-8deg]">
          B
        </Link>
        <div className="flex flex-col gap-1.5 rounded-chip bg-gradient-to-b from-card to-sunken p-1.5">
          {items.map((i) => <BotonNav key={i.href} item={i} activo={activo(i.href)} />)}
        </div>
        <div className="flex flex-col items-center gap-2 rounded-chip bg-card p-1.5">
          <form action={cerrarSesion}>
            <button aria-label="Cerrar sesión" className="grid size-11 place-items-center rounded-full text-muted transition hover:bg-white/5 hover:text-danger">
              <LogOut className="size-[1.1rem]" />
            </button>
          </form>
          <Avatar nombre={nombre} className="size-11 text-sm" />
        </div>
      </nav>

      {/* Celular: barra inferior de 5 botones + "Más" */}
      <NavMovil items={items} rol={rol} cerrarSesion={cerrarSesion} />
    </>
  );
}
