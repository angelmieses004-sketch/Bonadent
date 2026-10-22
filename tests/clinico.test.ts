import { describe, expect, it } from "vitest";
import { cotizarDesdeOdontograma, esPendiente, esPiezaValida, resumenOdontograma, textoTratamiento, todasLasPiezas } from "@/lib/reglas/odontograma";
import { horariosLibres } from "@/lib/reglas/agenda";
import { armarCotizacion } from "@/lib/ia/asistente";
import { enlaceWhatsApp, mensajeRecordatorio } from "@/lib/mensajes";
import { datosDeEjemplo } from "@/datos/ejemplo";
import type { Cita, PiezaDental } from "@/tipos";

const HOY = "2026-10-21"; // miércoles
const ej = datosDeEjemplo(HOY);
const pz = (pieza_fdi: number, estado: PiezaDental["estado"], situacion: PiezaDental["situacion"] = null): PiezaDental =>
  ({ paciente_id: "p", pieza_fdi, estado, situacion, nota: null, actualizado_en: "" });

describe("odontograma", () => {
  it("tiene 32 piezas adultas y 20 temporales con numeración FDI", () => {
    expect(todasLasPiezas("adulto")).toHaveLength(32);
    expect(todasLasPiezas("temporal")).toHaveLength(20);
    expect(esPiezaValida(18) && esPiezaValida(85) && esPiezaValida(31)).toBe(true);
    expect(esPiezaValida(19) || esPiezaValida(86) || esPiezaValida(90)).toBe(false);
  });

  it("caries y extracción siempre están pendientes; los tratamientos según situación", () => {
    expect(esPendiente(pz(46, "caries"))).toBe(true);
    expect(esPendiente(pz(48, "extraccion"))).toBe(true);
    expect(esPendiente(pz(36, "endodoncia", "indicado"))).toBe(true);
    expect(esPendiente(pz(36, "endodoncia", "realizado"))).toBe(false);
    expect(esPendiente(pz(18, "ausente"))).toBe(false);
  });

  it("resume pendientes, tratadas y sanas (las ausentes no cuentan como sanas)", () => {
    const r = resumenOdontograma([pz(46, "caries"), pz(36, "endodoncia", "indicado"), pz(16, "resina", "realizado"), pz(18, "ausente")]);
    expect(r).toMatchObject({ pendientes: 2, tratadas: 1, ausentes: 1, sanas: 28, total: 32 });
  });

  it("arma la cotización con las piezas pendientes y los precios del catálogo", () => {
    const { items, sinServicio } = cotizarDesdeOdontograma(
      [pz(46, "caries"), pz(36, "endodoncia", "indicado"), pz(16, "resina", "realizado"), pz(26, "corona", "indicado"), pz(14, "implante", "indicado")],
      ej.servicios,
    );
    expect(items.map((i) => i.pieza_fdi)).toEqual([14, 26, 36, 46]);
    expect(items.find((i) => i.pieza_fdi === 46)).toMatchObject({ precio: 3000, cantidad: 1 });
    expect(items.find((i) => i.pieza_fdi === 36)?.nombre).toContain("Endodoncia");
    expect(sinServicio).toEqual([]);
  });

  it("avisa las piezas sin servicio en el catálogo", () => {
    const sinImplante = ej.servicios.filter((s) => s.estado_odontograma !== "implante");
    expect(cotizarDesdeOdontograma([pz(14, "implante", "indicado")], sinImplante).sinServicio).toEqual([{ pieza_fdi: 14, estado: "implante" }]);
  });

  it("escribe el tratamiento para la agenda", () => {
    expect(textoTratamiento("endodoncia", 36)).toBe("Endodoncia · pieza 36");
    expect(textoTratamiento("caries", 46)).toBe("Resina · pieza 46");
  });
});

describe("horarios libres para aplazar", () => {
  const horario = { lun: ["08:00", "12:00"], mar: ["08:00", "12:00"], mie: ["08:00", "12:00"], jue: ["08:00", "12:00"], vie: ["08:00", "12:00"], sab: null, dom: null } as Record<string, [string, string] | null>;
  const c = (p: Partial<Cita>): Cita => ({ id: "x", paciente_id: "p", doctor_id: "d1", fecha: HOY, hora: "08:00", duracion_min: 30, tratamiento: "", estado: "programada", cada_dias: 0, aplazamientos: 0, es_ejemplo: false, ...p });

  it("ofrece días hábiles siguientes y salta fines de semana", () => {
    const libres = horariosLibres(c({}), [], horario, "2026-10-22"); // jueves
    expect(libres.map((l) => l.fecha)).toEqual(["2026-10-23", "2026-10-26", "2026-10-27"]);
    expect(libres[0].hora).toBe("08:00");
  });
  it("salta los horarios ocupados del mismo odontólogo", () => {
    const ocupada = c({ id: "otra", fecha: "2026-10-23", hora: "08:00", duracion_min: 60 });
    expect(horariosLibres(c({}), [ocupada], horario, "2026-10-22")[0]).toEqual({ fecha: "2026-10-23", hora: "09:00" });
  });
});

describe("asistente de prueba (cotizaciones)", () => {
  it("toma solo servicios del catálogo, con cantidades y descuento", () => {
    const r = armarCotizacion("Limpieza y 2 resinas con 10%", ej.servicios);
    expect(r.items.map((i) => [i.nombre, i.cantidad, i.precio])).toEqual([
      ["Limpieza (profilaxis)", 1, 2500],
      ["Resina (por pieza)", 2, 3000],
    ]);
    expect(r.descuento_pct).toBe(10);
  });
  it("si no reconoce nada, lo dice", () => {
    const r = armarCotizacion("algo que no existe", ej.servicios);
    expect(r.items).toEqual([]);
    expect(r.respuesta).toMatch(/No encontré/);
  });
});

describe("mensajes de WhatsApp", () => {
  it("rellena la plantilla del recordatorio", () => {
    const cita = ej.citas.find((x) => x.id === "c4")!;
    const m = mensajeRecordatorio("previo", 3, cita, ej.pacientes.find((p) => p.id === cita.paciente_id), ej.doctores.find((d) => d.id === cita.doctor_id), ej.clinica);
    expect(m).toContain("Hola Pedro");
    expect(m).toContain("en 3 días");
    expect(m).toContain("Dr. Miguel Taveras");
    expect(m).not.toMatch(/\{\w+\}/);
  });
  it("arma el enlace wa.me con el 1 de República Dominicana", () => {
    expect(enlaceWhatsApp("809-555-0111", "hola")).toBe("https://wa.me/18095550111?text=hola");
    expect(enlaceWhatsApp(null, "x")).toBeNull();
  });
});
