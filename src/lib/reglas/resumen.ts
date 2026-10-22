/** Cálculos de la pantalla Resumen. Funciones puras: reciben datos, devuelven lo que se pinta. */
import { sumarDias } from "@/lib/fechas";
import type { DatosOperacion } from "@/datos/ejemplo";
import type { Cita, Doctor, Paciente, Rol } from "@/tipos";
import { esActiva, recordatoriosDelDia, type RecordatorioDelDia } from "./recordatorios";
import { saldoPaciente } from "./saldo";

export type Tono = "lime" | "coral" | "royal";

export interface Metrica {
  titulo: string;
  valor: number;
  formato: "dinero" | "numero";
  serie: { dia: string; valor: number }[];
  filas: { etiqueta: string; valor: number }[];
  tono: Tono;
}

export interface CitaConNombres {
  cita: Cita;
  paciente: Paciente | undefined;
  doctor: Doctor | undefined;
}

export interface Resumen {
  grupo: string;
  metricas: Metrica[];
  porCobrar: { total: number; deudores: { id: string; nombre: string; saldo: number }[] };
  citasHoy: CitaConNombres[];
  confirmadasHoy: number;
  citasPorDia: Record<string, number>;
  recordatorios: (RecordatorioDelDia & { paciente: Paciente | undefined })[];
  ultimos7: { dia: string; ingreso: number; egreso: number }[];
  metaMes: { logrado: number; meta: number };
}

const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const promedio = (xs: number[]) => (xs.length ? Math.round(suma(xs) / xs.length) : 0);
const dias = (hoy: string, n: number) => Array.from({ length: n }, (_, i) => sumarDias(hoy, i - (n - 1)));

export function calcularResumen(hoy: string, datos: DatosOperacion, rol: Rol): Resumen {
  const { citas, movimientos, cotizaciones, pacientes, doctores, recordatorios, clinica } = datos;
  const mes = hoy.slice(0, 7);
  const mesPasado = sumarDias(`${mes}-01`, -1).slice(0, 7);
  const pac = new Map(pacientes.map((p) => [p.id, p]));
  const doc = new Map(doctores.map((d) => [d.id, d]));

  const delDia = (dia: string, tipo: "ingreso" | "egreso") =>
    suma(movimientos.filter((m) => m.fecha === dia && m.tipo === tipo).map((m) => Number(m.monto)));
  const delMes = (prefijo: string, tipo: "ingreso" | "egreso") =>
    suma(movimientos.filter((m) => m.fecha.startsWith(prefijo) && m.tipo === tipo).map((m) => Number(m.monto)));

  const ventana = dias(hoy, 14);
  const diasMes = Number(hoy.slice(8, 10));
  const ingresosMes = delMes(mes, "ingreso");
  const egresosMes = delMes(mes, "egreso");

  let acumulado = 0;
  const serieBalance = ventana.map((dia) => {
    acumulado += delDia(dia, "ingreso") - delDia(dia, "egreso");
    return { dia, valor: acumulado };
  });

  const metricasCaja: Metrica[] = [
    {
      titulo: "Ingresos del mes",
      valor: ingresosMes,
      formato: "dinero",
      tono: "lime",
      serie: ventana.map((dia) => ({ dia, valor: delDia(dia, "ingreso") })),
      filas: [
        { etiqueta: "Meta", valor: Number(clinica.meta_ingresos_mes) },
        { etiqueta: "Promedio diario", valor: Math.round(ingresosMes / diasMes) },
      ],
    },
    {
      titulo: "Egresos del mes",
      valor: egresosMes,
      formato: "dinero",
      tono: "coral",
      serie: ventana.map((dia) => ({ dia, valor: delDia(dia, "egreso") })),
      filas: [
        { etiqueta: "Mes pasado", valor: delMes(mesPasado, "egreso") },
        { etiqueta: "Promedio diario", valor: Math.round(egresosMes / diasMes) },
      ],
    },
    {
      titulo: "Balance del mes",
      valor: ingresosMes - egresosMes,
      formato: "dinero",
      tono: "royal",
      serie: serieBalance,
      filas: [
        { etiqueta: "Hoy", valor: delDia(hoy, "ingreso") - delDia(hoy, "egreso") },
        { etiqueta: "Mes pasado", valor: delMes(mesPasado, "ingreso") - delMes(mesPasado, "egreso") },
      ],
    },
  ];

  const noCanceladas = citas.filter((c) => c.estado !== "cancelada");
  const citasDe = (dia: string) => noCanceladas.filter((c) => c.fecha === dia).length;
  const semana = dias(sumarDias(hoy, 6), 7);
  const completadasMes = citas.filter((c) => c.estado === "completada" && c.fecha.startsWith(mes)).length;

  const metricasClinicas: Metrica[] = [
    {
      titulo: "Citas de hoy",
      valor: citasDe(hoy),
      formato: "numero",
      tono: "lime",
      serie: ventana.map((dia) => ({ dia, valor: citasDe(dia) })),
      filas: [
        { etiqueta: "Confirmadas", valor: noCanceladas.filter((c) => c.fecha === hoy && c.estado === "confirmada").length },
        { etiqueta: "Promedio diario", valor: promedio(ventana.map(citasDe)) },
      ],
    },
    {
      titulo: "Próximos 7 días",
      valor: suma(semana.map(citasDe)),
      formato: "numero",
      tono: "coral",
      serie: semana.map((dia) => ({ dia, valor: citasDe(dia) })),
      filas: [
        { etiqueta: "Por confirmar", valor: noCanceladas.filter((c) => semana.includes(c.fecha) && c.estado !== "confirmada").length },
        { etiqueta: "Día más lleno", valor: Math.max(0, ...semana.map(citasDe)) },
      ],
    },
    {
      titulo: "Completadas del mes",
      valor: completadasMes,
      formato: "numero",
      tono: "royal",
      serie: ventana.map((dia) => ({ dia, valor: citas.filter((c) => c.fecha === dia && c.estado === "completada").length })),
      filas: [
        { etiqueta: "Canceladas", valor: citas.filter((c) => c.estado === "cancelada" && c.fecha.startsWith(mes)).length },
        { etiqueta: "Pacientes", valor: new Set(citas.filter((c) => c.fecha.startsWith(mes)).map((c) => c.paciente_id)).size },
      ],
    },
  ];

  const deudores = pacientes
    .map((p) => ({ id: p.id, nombre: p.nombre, saldo: saldoPaciente(p.id, cotizaciones, movimientos) }))
    .filter((x) => x.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo);

  const citasHoy = noCanceladas
    .filter((c) => c.fecha === hoy)
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .map((cita) => ({ cita, paciente: pac.get(cita.paciente_id), doctor: cita.doctor_id ? doc.get(cita.doctor_id) : undefined }));

  const citasPorDia: Record<string, number> = {};
  for (const c of citas) if (esActiva(c) || c.estado === "completada") citasPorDia[c.fecha] = (citasPorDia[c.fecha] ?? 0) + 1;

  const verCaja = rol !== "odontologo";
  return {
    grupo: verCaja ? "Caja del mes" : "Actividad clínica",
    metricas: verCaja ? metricasCaja : metricasClinicas,
    porCobrar: { total: suma(deudores.map((d) => d.saldo)), deudores },
    citasHoy,
    confirmadasHoy: citasHoy.filter((x) => x.cita.estado === "confirmada" || x.cita.estado === "completada").length,
    citasPorDia,
    recordatorios: recordatoriosDelDia(hoy, recordatorios, citas).map((r) => ({ ...r, paciente: pac.get(r.cita.paciente_id) })),
    ultimos7: dias(hoy, 7).map((dia) => ({ dia, ingreso: delDia(dia, "ingreso"), egreso: delDia(dia, "egreso") })),
    metaMes: { logrado: ingresosMes, meta: Number(clinica.meta_ingresos_mes) },
  };
}
