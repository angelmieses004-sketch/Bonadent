"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy, Download, MessageCircle, Pencil, Trash2, Undo2, X } from "lucide-react";
import type { EstadoCotizacion } from "@/tipos";
import { avisar, ejecutar } from "@/components/ui/avisos";
import { borrarCotizacion, cambiarEstadoCotizacion } from "../acciones";

export function AccionesCotizacion({ id, estado, texto, enlace, puedeBorrar }: { id: string; estado: EstadoCotizacion; texto: string; enlace: string | null; puedeBorrar: boolean }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const cambiar = (e: EstadoCotizacion) => iniciar(() => ejecutar(() => cambiarEstadoCotizacion(id, e)));
  const copiar = async () => { try { await navigator.clipboard.writeText(texto); avisar("Texto copiado"); } catch { avisar("No se pudo copiar", "error"); } };
  const btn = "flex h-11 items-center justify-center gap-2 rounded-chip px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2">
      {enlace && (
        <a href={enlace} target="_blank" rel="noopener" onClick={() => estado === "borrador" && cambiar("enviada")} className={`${btn} bg-lime text-on-lime`}>
          <MessageCircle className="size-4" /> Enviar por WhatsApp
        </a>
      )}
      <div className="grid grid-cols-2 gap-2">
        <a href={`/api/cotizaciones/${id}/pdf`} className={`${btn} bg-raised`}><Download className="size-4" /> PDF</a>
        <button onClick={copiar} className={`${btn} bg-raised`}><Copy className="size-4" /> Copiar</button>
      </div>
      {estado !== "aprobada" && (
        <>
          <button disabled={pendiente} onClick={() => cambiar("aprobada")} className={`${btn} bg-royal text-on-royal hover:bg-royal-deep`}><Check className="size-4" /> El paciente aprobó</button>
          <Link href={`/cotizaciones/${id}?editar=1`} className={`${btn} bg-raised`}><Pencil className="size-4" /> Editar</Link>
        </>
      )}
      {estado === "aprobada" && <button disabled={pendiente} onClick={() => cambiar("enviada")} className={`${btn} bg-raised`}><Undo2 className="size-4" /> Quitar aprobación</button>}
      {estado !== "rechazada" && estado !== "aprobada" && <button disabled={pendiente} onClick={() => cambiar("rechazada")} className={`${btn} text-danger hover:bg-danger/10`}><X className="size-4" /> Rechazada</button>}
      {puedeBorrar && (
        <button disabled={pendiente} onClick={() => confirm("¿Eliminar esta cotización?") && iniciar(async () => { const r = await borrarCotizacion(id); if (r?.error) avisar(r.error, "error"); else { avisar("Cotización eliminada"); router.push("/cotizaciones"); } })} className={`${btn} text-danger hover:bg-danger/10`}>
          <Trash2 className="size-4" /> Eliminar
        </button>
      )}
    </div>
  );
}
