"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
import { Contrast, MapPin, Maximize, Minimize, RotateCcw, Sparkles, Sun, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { fechaCorta } from "@/lib/fechas";
import { ADULTO } from "@/lib/reglas/odontograma";
import { AVISO_SUGERENCIA } from "@/lib/ia/asistente";
import type { Marcador, Panoramica, SugerenciaIA } from "@/tipos";
import { Dialogo } from "@/components/ui/dialogo";
import { AreaTexto, Boton, Selector } from "@/components/ui/formulario";
import { ejecutar } from "@/components/ui/avisos";
import { guardarMarcador } from "./acciones";

const yaEscaneadas = new Set<string>();
const MIN = 1, MAX = 8;

export function VisorPanoramica({ panoramica, marcadores, sugerencias, piezaActiva, onElegirPieza, puedeEditar, iaActiva, onPedirSugerencias, pacienteId, pidiendo }: {
  panoramica: Panoramica;
  marcadores: Marcador[];
  sugerencias: SugerenciaIA[];
  piezaActiva: number | null;
  onElegirPieza: (n: number) => void;
  puedeEditar: boolean;
  iaActiva: boolean;
  onPedirSugerencias: () => void;
  pacienteId: string;
  pidiendo: boolean;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const escalaRef = useRef(1);
  useEffect(() => { escalaRef.current = escala; }, [escala]);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [brillo, setBrillo] = useState(100);
  const [contraste, setContraste] = useState(100);
  const [modo, setModo] = useState<"ver" | "marcar">("ver");
  const [completa, setCompleta] = useState(false);
  const [proporcion, setProporcion] = useState(2);
  const [nuevo, setNuevo] = useState<{ x: number; y: number } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const inicio = useRef<{ x: number; y: number; movido: boolean } | null>(null);
  const quieto = useReducedMotion();

  // ---- Escaneo: línea lima que recorre la imagen una vez ----
  const avance = useMotionValue(yaEscaneadas.has(panoramica.id) || quieto ? 1 : 0);
  const izquierda = useTransform(avance, (v) => `${v * 100}%`);
  const [pct, setPct] = useState(Math.round(avance.get() * 100));
  useMotionValueEvent(avance, "change", (v) => setPct(Math.round(v * 100)));
  const [cargada, setCargada] = useState(false);
  const imagen = useRef<HTMLImageElement>(null);
  const alCargar = useCallback((i: HTMLImageElement) => {
    if (i.naturalWidth) setProporcion(i.naturalWidth / i.naturalHeight);
    setCargada(true);
  }, []);
  // Si la imagen ya estaba en caché, onLoad pudo dispararse antes de hidratar: revisarla al montar.
  useEffect(() => {
    const i = imagen.current;
    if (i?.complete && i.naturalWidth) alCargar(i);
  }, [alCargar, panoramica.id]);
  useEffect(() => {
    if (!cargada || yaEscaneadas.has(panoramica.id) || quieto) return;
    yaEscaneadas.add(panoramica.id);
    avance.set(0);
    const ctl = animate(avance, 1, { duration: 2.6, ease: [0.45, 0, 0.2, 1], delay: 0.2 });
    return () => ctl.stop();
  }, [cargada, panoramica.id, quieto, avance]);

  const reiniciar = () => { escalaRef.current = 1; setEscala(1); setPos({ x: 0, y: 0 }); };
  const [idPrevio, setIdPrevio] = useState(panoramica.id);
  if (idPrevio !== panoramica.id) { setIdPrevio(panoramica.id); setEscala(1); setPos({ x: 0, y: 0 }); setCargada(false); }

  // ---- Zoom alrededor de un punto (coordenadas relativas a la caja) ----
  const zoomEn = useCallback((cx: number, cy: number, nueva: number) => {
    const s = escalaRef.current;
    const e = Math.min(MAX, Math.max(MIN, nueva));
    escalaRef.current = e;
    setEscala(e);
    setPos((p) => (e === 1 ? { x: 0, y: 0 } : { x: cx - ((cx - p.x) * e) / s, y: cy - ((cy - p.y) * e) / s }));
  }, []);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomEn(e.clientX - r.left, e.clientY - r.top, escalaRef.current * Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener("wheel", rueda, { passive: false });
    return () => el.removeEventListener("wheel", rueda);
  }, [zoomEn]);

  useEffect(() => {
    const f = () => setCompleta(document.fullscreenElement === caja.current?.parentElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);

  const abajo = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-arrastre]")) return;
    caja.current?.setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    inicio.current = { x: e.clientX, y: e.clientY, movido: false };
    setArrastrando(true);
  };
  const mover = (e: React.PointerEvent) => {
    const prev = punteros.current.get(e.pointerId);
    if (!prev) return;
    const lista = [...punteros.current.entries()];
    if (lista.length === 2) {
      const otro = lista.find(([id]) => id !== e.pointerId)![1];
      const antes = Math.hypot(prev.x - otro.x, prev.y - otro.y);
      const ahora = Math.hypot(e.clientX - otro.x, e.clientY - otro.y);
      const r = caja.current!.getBoundingClientRect();
      if (antes > 0) zoomEn((e.clientX + otro.x) / 2 - r.left, (e.clientY + otro.y) / 2 - r.top, escala * (ahora / antes));
    } else if (escala > 1) {
      setPos((p) => ({ x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }));
    }
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (inicio.current && Math.hypot(e.clientX - inicio.current.x, e.clientY - inicio.current.y) > 6) inicio.current.movido = true;
  };
  const arriba = (e: React.PointerEvent) => {
    const eraUno = punteros.current.size === 1;
    punteros.current.delete(e.pointerId);
    if (eraUno && modo === "marcar" && inicio.current && !inicio.current.movido && lienzo.current) {
      const r = lienzo.current.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) setNuevo({ x, y });
    }
    if (!punteros.current.size) { inicio.current = null; setArrastrando(false); }
  };

  const pantallaCompleta = () => {
    const el = caja.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const pendientes = sugerencias.filter((s) => s.decision === "pendiente");

  return (
    <div className={cn("flex flex-col gap-3", completa && "h-full justify-center bg-black p-4")}>
      <div
        ref={caja}
        role="application"
        aria-label={`Panorámica del ${fechaCorta(panoramica.tomada_en)}. Rueda o pellizco para acercar, arrastra para mover.`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "+" || e.key === "=") zoomEn(caja.current!.clientWidth / 2, caja.current!.clientHeight / 2, escala * 1.25);
          if (e.key === "-") zoomEn(caja.current!.clientWidth / 2, caja.current!.clientHeight / 2, escala / 1.25);
          if (e.key === "0") reiniciar();
        }}
        onPointerDown={abajo}
        onPointerMove={mover}
        onPointerUp={arriba}
        onPointerCancel={arriba}
        className={cn(
          "relative w-full touch-none overflow-hidden rounded-card bg-black select-none",
          modo === "marcar" ? "cursor-crosshair" : escala > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
          completa && "max-h-[85vh]",
        )}
        style={{ aspectRatio: proporcion }}
      >
        <div
          ref={lienzo}
          className="absolute inset-0 origin-top-left"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${escala})`, transition: arrastrando ? "none" : "transform 160ms ease-out" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API, no optimizable */}
          <img
            src={`/api/panoramicas/${panoramica.id}`}
            alt={`Radiografía panorámica del ${fechaCorta(panoramica.tomada_en)}`}
            draggable={false}
            ref={imagen}
            onLoad={(e) => alCargar(e.currentTarget)}
            className="size-full object-contain"
            style={{ filter: `brightness(${brillo}%) contrast(${contraste}%)` }}
          />

          {marcadores.map((k) => {
            const on = piezaActiva === k.pieza_fdi;
            return (
              <button
                key={k.id}
                data-no-arrastre
                onClick={() => onElegirPieza(k.pieza_fdi)}
                title={k.nota ?? `Pieza ${k.pieza_fdi}`}
                className="absolute"
                style={{ left: `${k.x * 100}%`, top: `${k.y * 100}%`, transform: `translate(-50%, -50%) scale(${1 / escala})` }}
              >
                <span className={cn("relative flex items-center gap-1 rounded-chip px-2 py-1 text-xs font-bold shadow-lift transition", on ? "bg-lime text-on-lime" : "bg-white/90 text-black hover:bg-lime")}>
                  {on && <span className="absolute inset-0 animate-ping rounded-chip bg-lime/60" />}
                  <MapPin className="relative size-3" /> <span className="relative">{k.pieza_fdi}</span>
                </span>
              </button>
            );
          })}

          {pendientes.map((s) => (
            <div
              key={s.id}
              className="pointer-events-none absolute rounded-full border-2 border-dashed border-warn bg-warn/10"
              style={{ left: `${(s.x - s.radio) * 100}%`, top: `${s.y * 100}%`, width: `${s.radio * 200}%`, aspectRatio: 1, transform: "translateY(-50%)" }}
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-chip bg-warn px-2 py-0.5 text-[0.65rem] font-bold whitespace-nowrap text-black" style={{ transform: `translateX(-50%) scale(${1 / escala})` }}>
                ¿{s.pieza_fdi}?
              </span>
            </div>
          ))}
        </div>

        {/* Escaneo */}
        {pct < 100 && (
          <div className="pointer-events-none absolute inset-0">
            <motion.div className="absolute inset-y-0 right-0 bg-black/60" style={{ left: izquierda }} />
            <motion.div className="absolute inset-y-0 w-0.5 bg-lime shadow-[0_0_24px_6px_rgb(212_247_90/0.55)]" style={{ left: izquierda }} />
            <motion.span className="absolute top-1/2 ml-3 rounded-chip bg-lime/90 px-3 py-1 text-xs font-bold text-on-lime" style={{ left: izquierda }}>
              Escaneando… {pct}%
            </motion.span>
          </div>
        )}

        <span className="pointer-events-none absolute top-3 left-3 rounded-chip bg-black/60 px-3 py-1 text-xs text-white backdrop-blur">
          {fechaCorta(panoramica.tomada_en)} {panoramica.tomada_en.slice(0, 4)}{panoramica.es_ejemplo ? " · imagen de prueba" : ""}
        </span>
        {escala > 1 && <span className="pointer-events-none absolute top-3 right-3 rounded-chip bg-black/60 px-3 py-1 text-xs tabular-nums text-white">{Math.round(escala * 100)}%</span>}
        {modo === "marcar" && <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-chip bg-lime px-3 py-1 text-xs font-bold text-on-lime">Toca un punto para marcar</span>}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-chip bg-raised p-1">
          <BotonIcono etiqueta="Alejar" onClick={() => zoomEn(caja.current!.clientWidth / 2, caja.current!.clientHeight / 2, escala / 1.4)}><ZoomOut className="size-4" /></BotonIcono>
          <span className="w-12 text-center text-xs tabular-nums text-muted">{Math.round(escala * 100)}%</span>
          <BotonIcono etiqueta="Acercar" onClick={() => zoomEn(caja.current!.clientWidth / 2, caja.current!.clientHeight / 2, escala * 1.4)}><ZoomIn className="size-4" /></BotonIcono>
          <BotonIcono etiqueta="Restablecer" onClick={() => { reiniciar(); setBrillo(100); setContraste(100); }}><RotateCcw className="size-4" /></BotonIcono>
        </div>
        <Deslizador icono={<Sun className="size-4" />} etiqueta="Brillo" valor={brillo} min={40} max={200} onCambio={setBrillo} />
        <Deslizador icono={<Contrast className="size-4" />} etiqueta="Contraste" valor={contraste} min={50} max={250} onCambio={setContraste} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {puedeEditar && (
            <button onClick={() => setModo((m) => (m === "marcar" ? "ver" : "marcar"))} aria-pressed={modo === "marcar"}
              className={cn("flex h-10 items-center gap-2 rounded-chip px-4 text-sm font-semibold transition", modo === "marcar" ? "bg-lime text-on-lime" : "bg-raised hover:bg-card")}>
              <MapPin className="size-4" /> {modo === "marcar" ? "Marcando…" : "Marcar"}
            </button>
          )}
          {puedeEditar && iaActiva && (
            <button onClick={onPedirSugerencias} disabled={pidiendo} className="flex h-10 items-center gap-2 rounded-chip bg-royal px-4 text-sm font-semibold text-on-royal transition hover:bg-royal-deep disabled:opacity-60">
              <Sparkles className={cn("size-4", pidiendo && "animate-spin")} /> {pidiendo ? "Analizando…" : "Pedir sugerencia"}
            </button>
          )}
          <BotonIcono etiqueta={completa ? "Salir de pantalla completa" : "Pantalla completa"} onClick={pantallaCompleta} className="bg-raised">
            {completa ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </BotonIcono>
        </div>
      </div>
      {pendientes.length > 0 && <p className="text-xs font-semibold text-warn">{AVISO_SUGERENCIA}</p>}

      <NuevoMarcador punto={nuevo} onCerrar={() => { setNuevo(null); setModo("ver"); }} panoramicaId={panoramica.id} pacienteId={pacienteId} piezaSugerida={piezaActiva} />
    </div>
  );
}

function BotonIcono({ etiqueta, onClick, children, className }: { etiqueta: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button onClick={onClick} aria-label={etiqueta} title={etiqueta} className={cn("grid size-10 place-items-center rounded-full text-muted transition hover:bg-card hover:text-ink active:scale-95", className)}>
      {children}
    </button>
  );
}

function Deslizador({ icono, etiqueta, valor, min, max, onCambio }: { icono: React.ReactNode; etiqueta: string; valor: number; min: number; max: number; onCambio: (v: number) => void }) {
  return (
    <label className="flex h-12 items-center gap-2 rounded-chip bg-raised px-3 text-muted" title={etiqueta}>
      {icono}
      <span className="sr-only">{etiqueta}</span>
      <input type="range" min={min} max={max} value={valor} onChange={(e) => onCambio(Number(e.target.value))} className="w-24 accent-[var(--color-lime)] sm:w-28" />
      <span className="w-9 text-right text-xs tabular-nums">{valor}%</span>
    </label>
  );
}

function NuevoMarcador({ punto, onCerrar, panoramicaId, pacienteId, piezaSugerida }: { punto: { x: number; y: number } | null; onCerrar: () => void; panoramicaId: string; pacienteId: string; piezaSugerida: number | null }) {
  const [pendiente, iniciar] = useTransition();
  const [pieza, setPieza] = useState(String(piezaSugerida ?? ""));
  const [nota, setNota] = useState("");
  const [puntoPrevio, setPuntoPrevio] = useState(punto);
  if (punto !== puntoPrevio) { setPuntoPrevio(punto); if (punto) { setPieza(String(piezaSugerida ?? "")); setNota(""); } }
  const guardar = () => iniciar(async () => {
    await ejecutar(() => guardarMarcador({ panoramica_id: panoramicaId, x: punto!.x, y: punto!.y, pieza_fdi: Number(pieza), nota: nota || null }, pacienteId));
    onCerrar();
  });
  return (
    <Dialogo abierto={Boolean(punto)} onCambio={(v) => !v && onCerrar()} titulo="Nuevo marcador" descripcion="Queda enlazado a la pieza en el odontograma.">
      <div className="flex flex-col gap-4">
        <Selector etiqueta="Pieza dental (FDI)" value={pieza} onChange={(e) => setPieza(e.target.value)}>
          <option value="">Elegir pieza…</option>
          <optgroup label="Arcada superior">{ADULTO.superior.map((n) => <option key={n} value={n}>{n}</option>)}</optgroup>
          <optgroup label="Arcada inferior">{ADULTO.inferior.map((n) => <option key={n} value={n}>{n}</option>)}</optgroup>
        </Selector>
        <AreaTexto etiqueta="Nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: lesión periapical" />
        <Boton onClick={guardar} cargando={pendiente} disabled={!pieza} className="h-12">Guardar marcador</Boton>
      </div>
    </Dialogo>
  );
}
