import { describe, expect, it } from "vitest";
import { saldoPaciente, totalCotizacion } from "@/lib/reglas/saldo";
import { generarRecordatorios, recordatoriosDelDia } from "@/lib/reglas/recordatorios";
import { buscarChoque, siguienteCitaRepetida } from "@/lib/reglas/agenda";
import { calcularResumen } from "@/lib/reglas/resumen";
import { datosDeEjemplo } from "@/datos/ejemplo";
import { diferenciaDias, sumarDias } from "@/lib/fechas";
import type { Cita } from "@/tipos";

const HOY = "2026-10-21";
const cita = (p: Partial<Cita>): Cita => ({
  id: "x", paciente_id: "p", doctor_id: "d1", fecha: HOY, hora: "09:00", duracion_min: 30,
  tratamiento: "Consulta", estado: "programada", cada_dias: 0, aplazamientos: 0, es_ejemplo: false, ...p,
});

describe("fechas", () => {
  it("suma días cruzando mes y año", () => {
    expect(sumarDias("2026-10-30", 3)).toBe("2026-11-02");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("calcula la diferencia en días", () => {
    expect(diferenciaDias("2026-10-21", "2026-10-24")).toBe(3);
  });
});

describe("saldo del paciente", () => {
  it("cotizaciones aprobadas menos ingresos del paciente", () => {
    const cot = [
      { paciente_id: "p1", estado: "aprobada" as const, total: 34770 },
      { paciente_id: "p1", estado: "enviada" as const, total: 9000 },
      { paciente_id: "p2", estado: "aprobada" as const, total: 5000 },
    ];
    const mov = [
      { paciente_id: "p1", tipo: "ingreso" as const, monto: 15000 },
      { paciente_id: "p1", tipo: "ingreso" as const, monto: 5000 },
      { paciente_id: "p1", tipo: "egreso" as const, monto: 999 },
      { paciente_id: null, tipo: "ingreso" as const, monto: 1000 },
    ];
    expect(saldoPaciente("p1", cot, mov)).toBe(14770);
    expect(saldoPaciente("p2", cot, mov)).toBe(5000);
    expect(saldoPaciente("p3", cot, mov)).toBe(0);
  });
  it("un pago de más deja saldo a favor (negativo)", () => {
    expect(saldoPaciente("p1", [{ paciente_id: "p1", estado: "aprobada", total: 1000 }], [{ paciente_id: "p1", tipo: "ingreso", monto: 1500 }])).toBe(-500);
  });
  it("total de cotización con descuento", () => {
    expect(totalCotizacion([{ precio: 35000, cantidad: 1 }, { precio: 800, cantidad: 2 }], 5)).toBe(34770);
    expect(totalCotizacion([{ precio: 3000, cantidad: 3 }])).toBe(9000);
    expect(totalCotizacion([{ precio: 100, cantidad: 1 }], 150)).toBe(0);
  });
});

describe("recordatorios", () => {
  it("genera aviso 3 días antes y el mismo día", () => {
    const [previo, hoy] = generarRecordatorios(cita({ fecha: "2026-10-24" }));
    expect(previo).toMatchObject({ tipo: "previo", fecha_envio: "2026-10-21", estado: "pendiente" });
    expect(hoy).toMatchObject({ tipo: "hoy", fecha_envio: "2026-10-24" });
  });

  it("selecciona los que salen hoy: previos de 1–3 días y los del mismo día", () => {
    const citas = [
      cita({ id: "hoy", fecha: HOY }),
      cita({ id: "en3", fecha: sumarDias(HOY, 3) }),
      cita({ id: "en1", fecha: sumarDias(HOY, 1) }), // creada tarde: el previo va atrasado
      cita({ id: "en5", fecha: sumarDias(HOY, 5) }),
      cita({ id: "cancelada", fecha: HOY, estado: "cancelada" }),
    ];
    const recs = citas.flatMap(generarRecordatorios);
    const sel = recordatoriosDelDia(HOY, recs, citas);
    const claves = sel.map((s) => `${s.cita.id}:${s.recordatorio.tipo}`);
    expect(claves).toEqual(["hoy:hoy", "en1:previo", "en3:previo"]);
    expect(sel.find((s) => s.cita.id === "en1")?.atrasado).toBe(true);
    expect(sel.find((s) => s.cita.id === "en3")?.atrasado).toBe(false);
  });

  it("no repite los enviados y sí reintenta los fallidos", () => {
    const c = cita({ id: "a", fecha: HOY });
    const [, hoy] = generarRecordatorios(c);
    expect(recordatoriosDelDia(HOY, [{ ...hoy, estado: "enviado" }], [c])).toHaveLength(0);
    expect(recordatoriosDelDia(HOY, [{ ...hoy, estado: "fallido" }], [c])).toHaveLength(1);
  });
});

describe("agenda", () => {
  const existentes = [cita({ id: "a", hora: "09:00", duracion_min: 60 }), cita({ id: "b", hora: "11:00", estado: "cancelada" })];

  it("detecta solape con el mismo odontólogo y día", () => {
    expect(buscarChoque(cita({ id: "n", hora: "09:30" }), existentes)?.id).toBe("a");
  });
  it("no choca si termina justo cuando empieza la otra", () => {
    expect(buscarChoque(cita({ id: "n", hora: "08:30", duracion_min: 30 }), existentes)).toBeUndefined();
  });
  it("ignora otro odontólogo, otro día, citas canceladas y la misma cita", () => {
    expect(buscarChoque(cita({ id: "n", doctor_id: "d2" }), existentes)).toBeUndefined();
    expect(buscarChoque(cita({ id: "n", fecha: "2026-10-22" }), existentes)).toBeUndefined();
    expect(buscarChoque(cita({ id: "n", hora: "11:00" }), existentes)).toBeUndefined();
    expect(buscarChoque(cita({ id: "a" }), existentes)).toBeUndefined();
  });

  it("al completar una cita repetida crea la siguiente N días después", () => {
    const sig = siguienteCitaRepetida(cita({ id: "a", cada_dias: 15, estado: "completada", aplazamientos: 2, es_ejemplo: true }));
    expect(sig).toMatchObject({ fecha: "2026-11-05", hora: "09:00", estado: "programada", aplazamientos: 0, es_ejemplo: false });
    expect(sig).not.toHaveProperty("id");
  });
  it("sin repetición no crea nada", () => {
    expect(siguienteCitaRepetida(cita({ cada_dias: 0 }))).toBeNull();
  });
});

describe("resumen", () => {
  const datos = datosDeEjemplo(HOY);
  it("recepción ve la caja; el odontólogo, su actividad clínica", () => {
    expect(calcularResumen(HOY, datos, "recepcion").grupo).toBe("Caja del mes");
    expect(calcularResumen(HOY, datos, "odontologo").grupo).toBe("Actividad clínica");
  });
  it("las citas de hoy salen ordenadas por hora", () => {
    const horas = calcularResumen(HOY, datos, "admin").citasHoy.map((x) => x.cita.hora);
    expect(horas).toEqual([...horas].sort());
  });
});
