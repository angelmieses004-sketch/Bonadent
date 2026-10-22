"use client";
import { motion } from "motion/react";

/** Entrada escalonada para las tarjetas de una pantalla (subir + aparecer). */
export function Aparecer({ children, orden = 0, className }: { children: React.ReactNode; orden?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: orden * 0.07, type: "spring", stiffness: 260, damping: 26 }}
    >
      {children}
    </motion.div>
  );
}
