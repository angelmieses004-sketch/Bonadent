"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BellRing, CalendarDays, Check, CheckCheck, Clock, MapPin, MessageCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fechaCorta, fechaLarga, hora12, sumarDias } from "@/lib/fechas";
import { Chips } from "@/components/bona/chips";
import { ESTADO_CITA } from "@/components/bona/tarjeta-cita";
import type { EstadoCita } from "@/tipos";

export interface DatosDemo {
  hoy: string;
  paciente: string;
  telefono: string;
  doctor: string;
  tratamiento: string;
  hora: string;
  clinica: string;
  direccion: string;
  libres: { fecha: string; hora: string }[];
}

type Escena = "previo" | "hoy" | "aplaza";
type Burbuja = { id: number; de: "bot" | "pac" | "dia" | "ubicacion" | "escribiendo"; texto?: string; botones?: string[]; elegido?: number; hora?: string };

const PASOS: Record<Escena, string[]> = {
  previo: ["7:45 a. m.: el bot revisa la agenda y encuentra la cita que es en 3 días.", "Le escribe al paciente con fecha, hora, odontólogo y dirección.", "El paciente toca «Confirmo».", "El bot responde y la cita pasa a Confirmada en la agenda, sin que recepción haga nada."],
  hoy: ["El día de la cita, a las 7:45 a. m., el bot vuelve a revisar la agenda.", "Envía el recordatorio de hoy con la hora exacta.", "Manda la ubicación de la clínica.", "El paciente responde «Ahí estaré» y recepción lo ve en la agenda."],
  aplaza: ["7:45 a. m.: el bot revisa la agenda.", "Envía el aviso de 3 días antes.", "El paciente no puede y toca «Aplazar».", "El bot busca horarios libres de su mismo odontólogo.", "El paciente elige un horario nuevo.", "La cita se mueve sola y los recordatorios se reprograman."],
};
const NOMBRES: Record<Escena, string> = { previo: "Aviso 3 días antes", hoy: "Aviso el mismo día", aplaza: "El paciente aplaza" };

export function EscenarioBot({ d }: { d: DatosDemo }) {
  const [escena, setEscena] = useState<Escena>("previo");
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const [paso, setPaso] = useState(-1);
  const [log, setLog] = useState<string[]>([]);
  const [cita, setCita] = useState<{ estado: EstadoCita; fecha: string; hora: string; nota: string }>({ estado: "programada", fecha: sumarDias(d.hoy, 3), hora: d.hora, nota: "" });
  const [linea, setLinea] = useState(0);
  const [dedo, setDedo] = useState<{ x: number; y: number; on: boolean }>({ x: 0, y: 0, on: false });
  const [destello, setDestello] = useState(0);
  const corrida = useRef(0);
  const chat = useRef<HTMLDivElement>(null);
  const telefono = useRef<HTMLDivElement>(null);
  const quieto = useReducedMotion();

  const reproducir = useCallback(async (esc: Escena) => {
    const id = ++corrida.current;
    const k = quieto ? 0.06 : 1;
    const vivo = () => id === corrida.current;
    const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms * k));
    let n = 0;
    const agregar = (b: Omit<Burbuja, "id">) => { const nb = { ...b, id: ++n }; setBurbujas((l) => [...l.filter((x) => x.de !== "escribiendo"), nb]); return nb.id; };
    const escribiendo = async (ms: number) => { agregar({ de: "escribiendo" }); await dormir(ms); setBurbujas((l) => l.filter((x) => x.de !== "escribiendo")); };
    const anotar = (t: string) => setLog((l) => [...l, t]);
    const actualizar = (c: Partial<typeof cita>) => { setCita((x) => ({ ...x, ...c })); setDestello((x) => x + 1); };
    const tocar = async (burbuja: number, boton: number, texto: string) => {
      const el = telefono.current?.querySelector<HTMLElement>(`[data-b="${burbuja}-${boton}"]`);
      const caja = telefono.current?.getBoundingClientRect();
      if (el && caja) {
        const r = el.getBoundingClientRect();
        setDedo({ x: r.left - caja.left + r.width / 2, y: r.top - caja.top + r.height / 2, on: true });
      }
      await dormir(800); if (!vivo()) return;
      setBurbujas((l) => l.map((b) => (b.id === burbuja ? { ...b, elegido: boton } : b)));
      await dormir(400); setDedo((x) => ({ ...x, on: false }));
      await dormir(300); agregar({ de: "pac", texto, hora: "7:52" });
    };

    const fechaCita = esc === "hoy" ? d.hoy : sumarDias(d.hoy, 3);
    const corto = d.paciente.split(" ")[0];
    setBurbujas([]); setLog([]); setPaso(0); setLinea(0); setDedo({ x: 0, y: 0, on: false });
    setCita({ estado: esc === "hoy" ? "confirmada" : "programada", fecha: fechaCita, hora: d.hora, nota: esc === "hoy" ? "Confirmó hace 3 días" : "" });
    agregar({ de: "dia", texto: esc === "hoy" ? "Hoy" : fechaLarga(d.hoy) });
    anotar(`7:45 a. m. · el bot revisa la agenda de ${d.clinica}`);
    await dormir(1300); if (!vivo()) return;
    anotar(`Encontró la cita de ${d.paciente} · ${fechaCorta(fechaCita)} ${hora12(d.hora)}`);
    setLinea(esc === "hoy" ? 2 : 1);
    await dormir(800); if (!vivo()) return;

    if (esc === "previo" || esc === "aplaza") {
      setPaso(1); await escribiendo(1200); if (!vivo()) return;
      const msg = agregar({ de: "bot", hora: "7:45", texto: `Hola ${corto} 👋\nLe recordamos su cita dental:\n\n📅 ${fechaLarga(fechaCita)}\n🕘 ${hora12(d.hora)}\n🦷 ${d.tratamiento} con ${d.doctor}\n📍 ${d.clinica}, ${d.direccion}\n\n¿Nos confirma su asistencia?`, botones: ["Confirmo", "Aplazar"] });
      anotar(`Enviado a ${d.telefono} · plantilla recordatorio_cita_3dias`);
      actualizar({ nota: "Aviso de 3 días enviado" });
      await dormir(2000); if (!vivo()) return;
      setPaso(2);
      if (esc === "previo") {
        await tocar(msg, 0, "Confirmo"); if (!vivo()) return;
        anotar(`${corto} respondió: Confirmo`);
        await dormir(600); setPaso(3); await escribiendo(1000); if (!vivo()) return;
        agregar({ de: "bot", hora: "7:52", texto: `¡Gracias, ${corto}! ✅ Su cita quedó confirmada. El mismo día le enviaremos otro recordatorio.` });
        actualizar({ estado: "confirmada", nota: "Confirmada por el paciente" });
        anotar("Agenda actualizada: cita confirmada");
        setPaso(4);
      } else {
        await tocar(msg, 1, "Aplazar"); if (!vivo()) return;
        anotar(`${corto} pidió aplazar`);
        await dormir(500); setPaso(3); await escribiendo(1200); if (!vivo()) return;
        anotar(`Buscó horarios libres de ${d.doctor}: ${d.libres.length} disponibles`);
        const m2 = agregar({ de: "bot", hora: "7:53", texto: `Sin problema, ${corto}. Estos son los horarios libres con ${d.doctor}:`, botones: d.libres.map((l) => `${fechaCorta(l.fecha)} · ${hora12(l.hora)}`) });
        await dormir(1800); if (!vivo()) return;
        setPaso(4);
        const elegido = d.libres[1] ?? d.libres[0];
        await tocar(m2, d.libres[1] ? 1 : 0, `${fechaCorta(elegido.fecha)} · ${hora12(elegido.hora)}`); if (!vivo()) return;
        await dormir(500); setPaso(5); await escribiendo(1100); if (!vivo()) return;
        agregar({ de: "bot", hora: "7:54", texto: `Listo ✅ Su cita quedó para el ${fechaLarga(elegido.fecha)} a las ${hora12(elegido.hora)} con ${d.doctor}.\n\nLe recordaremos 3 días antes y el mismo día.` });
        actualizar({ estado: "aplazada", fecha: elegido.fecha, hora: elegido.hora, nota: "Aplazada por WhatsApp" });
        anotar(`Cita movida al ${fechaCorta(elegido.fecha)} ${hora12(elegido.hora)}`);
        anotar(`Recordatorios reprogramados: ${fechaCorta(sumarDias(elegido.fecha, -3))} y ${fechaCorta(elegido.fecha)}`);
        setPaso(6);
      }
    } else {
      setPaso(1); await escribiendo(1100); if (!vivo()) return;
      const msg = agregar({ de: "bot", hora: "7:45", texto: `Buenos días, ${corto} ☀️\nHOY es su cita a las ${hora12(d.hora)} con ${d.doctor} (${d.tratamiento}).\n\nLe esperamos en ${d.clinica}.`, botones: ["Ahí estaré", "Aplazar"] });
      anotar(`Enviado a ${d.telefono} · plantilla recordatorio_cita_hoy`);
      actualizar({ nota: "Aviso del día enviado" });
      await dormir(1400); if (!vivo()) return;
      setPaso(2); await escribiendo(700); if (!vivo()) return;
      agregar({ de: "ubicacion", hora: "7:45", texto: d.direccion });
      anotar("Ubicación enviada");
      await dormir(1600); if (!vivo()) return;
      setPaso(3);
      await tocar(msg, 0, "Ahí estaré 👍"); if (!vivo()) return;
      await dormir(400); await escribiendo(800); if (!vivo()) return;
      agregar({ de: "bot", hora: "8:03", texto: `¡Perfecto! Nos vemos a las ${hora12(d.hora)}. 🦷` });
      actualizar({ nota: "El paciente viene en camino" });
      anotar(`Recepción ve en la agenda: ${corto} asistirá`);
      setPaso(4);
    }
    setLinea(esc === "hoy" ? 3 : 1);
  }, [d, quieto]);

  useEffect(() => {
    const t = setTimeout(() => reproducir(escena), 0);
    const ref = corrida;
    return () => { clearTimeout(t); ref.current++; };
  }, [escena, reproducir]);
  useEffect(() => { chat.current?.scrollTo({ top: chat.current.scrollHeight, behavior: quieto ? "auto" : "smooth" }); }, [burbujas, quieto]);

  const est = ESTADO_CITA[cita.estado];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Mírelo en acción</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Chips etiqueta="Escena" valor={escena} onCambio={setEscena} opciones={(Object.keys(NOMBRES) as Escena[]).map((e) => ({ valor: e, texto: NOMBRES[e] }))} />
          <button onClick={() => reproducir(escena)} className="flex h-11 items-center gap-2 rounded-chip bg-card px-4 text-sm font-semibold transition hover:-translate-y-0.5"><RotateCcw className="size-4" /> Repetir</button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Teléfono */}
        <div ref={telefono} className="relative mx-auto w-full max-w-[360px]">
          <div className="flex h-[640px] flex-col overflow-hidden rounded-[44px] border-[10px] border-night bg-[#0e1513] shadow-lift ring-1 ring-hairline">
            <div className="flex items-center gap-3 bg-royal px-4 pt-5 pb-3 text-on-royal">
              <span className="grid size-10 place-items-center rounded-full bg-lime text-lg font-black text-on-lime">{d.clinica.replace(/^Cl[ií]nica\s+(Dental\s+)?/i, "").charAt(0)}</span>
              <span className="min-w-0"><b className="block truncate text-sm">{d.clinica}</b><small className="text-xs text-white/75">Cuenta de empresa verificada</small></span>
            </div>
            <div ref={chat} className="flex flex-1 flex-col gap-2 overflow-y-auto p-3" aria-live="polite">
              <AnimatePresence initial={false}>
                {burbujas.map((b) => <BurbujaChat key={b.id} b={b} />)}
              </AnimatePresence>
            </div>
          </div>
          <motion.span
            aria-hidden
            className="pointer-events-none absolute z-10 size-9 rounded-full border-[3px] border-lime bg-lime/25"
            animate={{ left: dedo.x - 18, top: dedo.y - 18, opacity: dedo.on ? 1 : 0, scale: dedo.on ? [1, 0.8, 1] : 0.6 }}
            transition={{ duration: 0.6 }}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="card flex flex-col gap-3">
            <h3 className="text-lg font-semibold">Qué está pasando</h3>
            <ol className="flex flex-col gap-1.5">
              {PASOS[escena].map((t, i) => (
                <motion.li key={`${escena}-${i}`} animate={{ opacity: i <= paso ? 1 : 0.45 }} className={cn("flex gap-3 rounded-tile p-2.5 text-sm transition-colors", i === paso && "bg-lime/12")}>
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold", i < paso ? "bg-lime text-on-lime" : i === paso ? "bg-royal text-on-royal" : "bg-raised text-muted")}>
                    {i < paso ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  {t}
                </motion.li>
              ))}
            </ol>
          </section>

          <section className="card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">La cita en el CRM</h3>
              <span className="flex items-center gap-1.5 rounded-chip bg-ok/15 px-2.5 py-1 text-xs font-semibold text-ok"><span className="size-1.5 animate-pulse rounded-full bg-ok" /> En vivo</span>
            </div>
            <motion.div key={destello} initial={{ boxShadow: "0 0 0 0px rgb(212 247 90 / 0)" }} animate={{ boxShadow: ["0 0 0 4px rgb(212 247 90 / 0.7)", "0 0 0 0px rgb(212 247 90 / 0)"] }} transition={{ duration: 0.9 }} className="relative flex flex-col gap-2 overflow-hidden rounded-tile bg-raised p-4 pl-6">
              <span className={cn("absolute inset-y-3 left-2.5 w-1 rounded-full", est.barra)} />
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold tabular-nums">{hora12(cita.hora)}</span>
                <motion.span key={cita.estado} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("rounded-chip px-3 py-1 text-xs font-semibold", est.clase)}>{est.texto}</motion.span>
              </div>
              <p className="font-semibold">{d.paciente}</p>
              <p className="text-sm text-muted">{d.tratamiento} · {d.doctor} · {fechaLarga(cita.fecha)}</p>
              {cita.nota && <p className="text-xs font-semibold text-lime">{cita.nota}</p>}
            </motion.div>
            <ol className="flex max-h-40 flex-col gap-1 overflow-y-auto font-mono text-xs text-muted">
              {log.map((l, i) => <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>› {l}</motion.li>)}
            </ol>
          </section>

          <section className="card flex flex-col gap-4">
            <h3 className="text-lg font-semibold">La vida de una cita</h3>
            <div className="relative px-2 pt-2">
              <div className="absolute top-[22px] right-[12%] left-[12%] h-1 rounded-full bg-raised">
                <motion.div className="h-full origin-left rounded-full bg-lime" animate={{ scaleX: linea / 3 }} transition={{ duration: 0.9 }} />
              </div>
              <ol className="relative grid grid-cols-4 gap-2 text-center text-xs">
                {[["Se agenda", "Recepción la crea"], ["3 días antes", "Aviso y confirmación"], ["El mismo día", "Hora y ubicación"], ["Después", "Brackets: la próxima en 15 días"]].map(([t, s], i) => (
                  <li key={t} className="flex flex-col items-center gap-1.5">
                    <motion.span animate={{ scale: i <= linea ? 1 : 0.85 }} className={cn("size-6 rounded-full border-4 transition-colors", i <= linea ? "border-lime bg-lime shadow-glow" : "border-raised bg-card")} />
                    <b className={cn("text-sm", i <= linea ? "text-ink" : "text-muted")}>{t}</b>
                    <span className="text-muted">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </div>
      <p className="text-xs text-muted">Simulación con datos de ejemplo ficticios. No se envía ningún mensaje real.</p>
    </div>
  );
}

function BurbujaChat({ b }: { b: Burbuja }) {
  const base = { initial: { opacity: 0, y: 10, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0 }, transition: { type: "spring" as const, stiffness: 420, damping: 28 } };
  if (b.de === "dia") return <motion.span {...base} className="self-center rounded-chip bg-white/8 px-3 py-1 text-[0.7rem] text-white/60">{b.texto}</motion.span>;
  if (b.de === "escribiendo") return (
    <motion.span {...base} className="flex gap-1 self-start rounded-2xl rounded-tl-sm bg-[#1d2a27] px-3.5 py-3" aria-label="Escribiendo">
      {[0, 1, 2].map((i) => <motion.i key={i} className="size-1.5 rounded-full bg-white/60" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />)}
    </motion.span>
  );
  if (b.de === "ubicacion") return (
    <motion.div {...base} className="max-w-[86%] self-start overflow-hidden rounded-2xl rounded-tl-sm bg-[#1d2a27] text-white">
      <div className="grid h-24 place-items-center bg-[repeating-linear-gradient(35deg,#24342f_0_14px,#1a2622_14px_16px)]"><MapPin className="size-7 text-coral" /></div>
      <p className="px-3 py-2 text-xs">{b.texto}</p>
    </motion.div>
  );
  const bot = b.de === "bot";
  return (
    <motion.div {...base} className={cn("max-w-[86%] rounded-2xl px-3 pt-2 pb-1.5 text-[0.84rem] leading-snug whitespace-pre-wrap text-white", bot ? "self-start rounded-tl-sm bg-[#1d2a27]" : "self-end rounded-tr-sm bg-[#1f4d3f]")}>
      {b.texto}
      <span className="mt-0.5 flex items-center justify-end gap-1 text-[0.65rem] text-white/50">{b.hora} <CheckCheck className="size-3 text-sky-300" /></span>
      {b.botones && (
        <span className="-mx-3 mt-1.5 flex flex-col border-t border-white/10">
          {b.botones.map((t, i) => (
            <span key={t} data-b={`${b.id}-${i}`} className={cn("relative overflow-hidden border-b border-white/10 py-2 text-center font-semibold text-sky-300 last:border-b-0", b.elegido === i && "bg-white/10")}>
              {b.elegido === i && <motion.span className="absolute top-1/2 left-1/2 size-4 rounded-full bg-sky-300/40" initial={{ scale: 0, x: "-50%", y: "-50%" }} animate={{ scale: 20, opacity: 0 }} transition={{ duration: 0.7 }} />}
              {t}
            </span>
          ))}
        </span>
      )}
    </motion.div>
  );
}

/** Flujo diario: los 4 pasos se encienden en ciclo. */
export function FlujoDiario() {
  const [i, setI] = useState(0);
  const quieto = useReducedMotion();
  useEffect(() => { if (quieto) return; const t = setInterval(() => setI((x) => (x + 1) % 4), 1400); return () => clearInterval(t); }, [quieto]);
  const pasos = [
    { icono: Clock, n: "7:45 A. M.", t: "Se activa el bot", s: "Antes de que abra la clínica." },
    { icono: CalendarDays, n: "AGENDA", t: "Revisa las citas", s: "Las de dentro de 3 días y las de hoy." },
    { icono: MessageCircle, n: "WHATSAPP", t: "Escribe al paciente", s: "Mensaje oficial con el nombre de la clínica." },
    { icono: BellRing, n: "CRM", t: "Actualiza la agenda", s: "Confirmada, aplazada o pendiente." },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {pasos.map((p, k) => (
        <motion.div key={p.t} animate={{ y: k === i ? -4 : 0 }} className={cn("flex flex-col gap-2 rounded-card p-4 transition-colors duration-300", k === i ? "bg-lime text-on-lime" : "bg-card")}>
          <p.icono className="size-6" />
          <span className={cn("text-[0.7rem] font-bold tracking-widest", k === i ? "text-on-lime/70" : "text-lime")}>{p.n}</span>
          <b>{p.t}</b>
          <span className={cn("text-sm", k === i ? "text-on-lime/75" : "text-muted")}>{p.s}</span>
        </motion.div>
      ))}
    </div>
  );
}
