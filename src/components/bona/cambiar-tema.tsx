"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";

/** Alterna oscuro/claro al instante y lo recuerda en una cookie (el servidor la lee para no parpadear). */
export function CambiarTema({ inicial }: { inicial: "dark" | "light" }) {
  const [tema, setTema] = useState(inicial);
  const cambiar = () => {
    const nuevo = tema === "dark" ? "light" : "dark";
    setTema(nuevo);
    document.documentElement.dataset.theme = nuevo;
    document.cookie = `bona_tema=${nuevo}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <button
      onClick={cambiar}
      aria-label={tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-card text-muted transition hover:text-ink active:scale-95"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={tema} initial={{ y: -18, rotate: -90, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} exit={{ y: 18, rotate: 90, opacity: 0 }}>
          {tema === "dark" ? <Sun className="size-[1.1rem]" /> : <Moon className="size-[1.1rem]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
