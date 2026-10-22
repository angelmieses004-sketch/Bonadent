"use client";
import { MotionConfig } from "motion/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Avisos } from "@/components/ui/avisos";

/** reducedMotion="user": si el sistema pide menos movimiento, las animaciones de transformación se apagan solas. */
export function Proveedores({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>
      <Tooltip.Provider delayDuration={250}>
        {children}
        <Avisos />
      </Tooltip.Provider>
    </MotionConfig>
  );
}
