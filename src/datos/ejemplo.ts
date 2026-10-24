/**
 * DATOS DE EJEMPLO (ficticios). Se usan en la vista previa sin Supabase y en /demo.
 * Ningún nombre, teléfono ni monto pertenece a una persona real.
 * El mismo contenido está en supabase/seed.sql con es_ejemplo = true.
 */
import { sumarDias } from "@/lib/fechas";
import type { ArticuloInventario, Cita, Clinica, Cotizacion, Doctor, EventoPieza, MovimientoInventario, Marcador, Movimiento, Paciente, Panoramica, PiezaDental, Recordatorio, Servicio, SugerenciaIA } from "@/tipos";
import { generarRecordatorios } from "@/lib/reglas/recordatorios";
import { posicionPieza } from "@/lib/panoramica-sintetica";

const ex = { es_ejemplo: true } as const;

export function datosDeEjemplo(hoy: string) {
  const d = (n: number) => sumarDias(hoy, n);

  const clinica: Clinica = {
    nombre: "Clínica Dental Sonrisa",
    telefono: "809-555-0100",
    direccion: "Calle del Sol #45, Santiago",
    meta_ingresos_mes: 150000,
    horario: { lun: ["08:00", "18:00"], mar: ["08:00", "18:00"], mie: ["08:00", "18:00"], jue: ["08:00", "18:00"], vie: ["08:00", "18:00"], sab: ["08:00", "13:00"], dom: null },
    textos_recordatorio: {},
    ia_sugerencias: false,
  };

  const doctores: Doctor[] = [
    { id: "d1", nombre: "Dra. Laura Peña", especialidad: "Ortodoncia", color: "#d4f75a", activo: true, ...ex },
    { id: "d2", nombre: "Dr. Miguel Taveras", especialidad: "Odontología general", color: "#8fa2ff", activo: true, ...ex },
    { id: "d3", nombre: "Dra. Carla Núñez", especialidad: "Endodoncia", color: "#ff8a5b", activo: true, ...ex },
  ];

  const servicios: Servicio[] = [
    ["s01", "Consulta y evaluación", 1500, null],
    ["s02", "Limpieza (profilaxis)", 2500, null],
    ["s03", "Resina (por pieza)", 3000, "caries"],
    ["s04", "Extracción simple", 2500, "extraccion"],
    ["s05", "Endodoncia (tratamiento de conducto)", 12000, "endodoncia"],
    ["s06", "Corona de porcelana", 18000, "corona"],
    ["s07", "Blanqueamiento", 9000, null],
    ["s08", "Brackets metálicos (instalación)", 35000, null],
    ["s09", "Control de brackets", 2000, null],
    ["s10", "Radiografía periapical", 800, null],
    ["s11", "Implante dental", 85000, "implante"],
    ["s12", "Reconstrucción con resina", 4500, null],
    ["s13", "Perno de fibra de vidrio", 5000, null],
  ].map(([id, nombre, precio, estado]) => ({
    id: id as string,
    nombre: nombre as string,
    precio: precio as number,
    estado_odontograma: estado as string | null,
    activo: true,
    ...ex,
  }));

  const pacientes: Paciente[] = [
    { id: "p1", nombre: "Ana Rodríguez", telefono: "809-555-0111", notas: "Brackets, control cada 15 días", alergias: null, doctor_principal_id: "d1", fecha_nacimiento: "1996-04-12", ...ex },
    { id: "p2", nombre: "José Almonte", telefono: "829-555-0122", notas: null, alergias: null, doctor_principal_id: "d2", fecha_nacimiento: "1988-09-03", ...ex },
    { id: "p3", nombre: "María Fernández", telefono: "849-555-0133", notas: null, alergias: "Penicilina", doctor_principal_id: "d3", fecha_nacimiento: "1979-01-25", ...ex },
    { id: "p4", nombre: "Pedro Sánchez", telefono: "809-555-0144", notas: null, alergias: null, doctor_principal_id: "d2", fecha_nacimiento: "2001-06-30", ...ex },
    { id: "p5", nombre: "Lucía Batista", telefono: "829-555-0155", notas: null, alergias: null, doctor_principal_id: "d1", fecha_nacimiento: "2010-11-18", ...ex },
    { id: "p6", nombre: "Ramón Guzmán", telefono: "809-555-0166", notas: null, alergias: null, doctor_principal_id: "d3", fecha_nacimiento: "1965-02-08", ...ex },
  ];

  const c = (id: string, paciente_id: string, doctor_id: string, dia: number, hora: string, tratamiento: string, estado: Cita["estado"], duracion_min = 30, cada_dias = 0): Cita => ({
    id, paciente_id, doctor_id, fecha: d(dia), hora, tratamiento, estado, duracion_min, cada_dias, aplazamientos: 0, ...ex,
  });

  const citas: Cita[] = [
    c("c1", "p1", "d1", 0, "09:00", "Control de brackets", "confirmada", 30, 15),
    c("c2", "p2", "d2", 0, "10:30", "Limpieza", "programada", 45),
    c("c3", "p3", "d3", 0, "15:00", "Endodoncia 2da sesión", "programada", 90),
    c("c8", "p6", "d2", 0, "17:00", "Evaluación de implante", "confirmada", 30),
    c("c4", "p4", "d2", 3, "11:00", "Resinas", "programada"),
    c("c5", "p5", "d1", 3, "16:00", "Evaluación de ortodoncia", "programada"),
    c("c6", "p2", "d2", 2, "09:30", "Extracción", "programada"),
    c("c9", "p6", "d3", 5, "10:00", "Corona: toma de impresión", "programada", 60),
    c("c10", "p3", "d3", 9, "15:00", "Control de endodoncia", "programada"),
    c("c11", "p4", "d1", 12, "08:30", "Blanqueamiento", "programada", 60),
    c("c12", "p5", "d1", 17, "16:00", "Instalación de brackets", "programada", 90),
    c("c7", "p1", "d1", -15, "09:00", "Control de brackets", "completada"),
    c("c13", "p2", "d2", -6, "11:00", "Consulta", "completada"),
    c("c14", "p4", "d2", -4, "10:00", "Limpieza", "completada", 45),
    c("c15", "p3", "d3", -2, "14:00", "Endodoncia 1ra sesión", "completada", 90),
    c("c16", "p5", "d1", -1, "16:00", "Consulta", "completada"),
  ];

  // Recordatorios como los crea el trigger; los de citas pasadas ya se enviaron.
  const recordatorios: Recordatorio[] = citas.flatMap((ci) =>
    generarRecordatorios(ci).map((r) => ({
      ...r,
      estado: ci.estado === "completada" ? "enviado" : r.fecha_envio < hoy ? "enviado" : r.estado,
    })),
  );
  // c4 y c5 son en 3 días: su aviso previo sale hoy y sigue pendiente.

  const m = (id: string, tipo: Movimiento["tipo"], dia: number, concepto: string, categoria: string, metodo: Movimiento["metodo"], monto: number, paciente_id: string | null = null): Movimiento => ({
    id, tipo, fecha: d(dia), concepto, categoria, metodo, monto, paciente_id, ...ex,
  });

  const movimientos: Movimiento[] = [
    m("m1", "ingreso", 0, "Abono brackets", "Abono", "Transferencia", 5000, "p1"),
    m("m2", "egreso", 0, "Botellón de agua", "Servicios", "Efectivo", 1000),
    m("m3", "ingreso", -1, "Consulta", "Consulta", "Efectivo", 1500, "p5"),
    m("m4", "egreso", -1, "Guantes y mascarillas", "Insumos", "Tarjeta", 4200),
    m("m5", "ingreso", -2, "Endodoncia 1ra sesión", "Tratamiento", "Tarjeta", 6000, "p3"),
    m("m6", "egreso", -3, "Laboratorio: corona", "Laboratorio", "Transferencia", 7500),
    m("m7", "ingreso", -4, "Limpieza", "Tratamiento", "Efectivo", 2500, "p4"),
    m("m8", "ingreso", -15, "Inicial brackets", "Abono", "Transferencia", 15000, "p1"),
    m("m9", "ingreso", -5, "Resinas x2", "Tratamiento", "Tarjeta", 6000, "p2"),
    m("m10", "ingreso", -6, "Consulta", "Consulta", "Efectivo", 1500, "p2"),
    m("m11", "egreso", -6, "Pago de luz", "Servicios", "Transferencia", 3800),
    m("m12", "ingreso", -8, "Blanqueamiento", "Tratamiento", "Tarjeta", 9000, "p6"),
    m("m13", "ingreso", -9, "Abono corona", "Abono", "Transferencia", 8000, "p6"),
    m("m14", "egreso", -10, "Compra de resinas", "Insumos", "Tarjeta", 5600),
    m("m15", "ingreso", -11, "Extracción", "Tratamiento", "Efectivo", 2500, "p4"),
    m("m16", "ingreso", -12, "Limpieza", "Tratamiento", "Efectivo", 2500, "p5"),
    m("m17", "egreso", -13, "Alquiler del local", "Alquiler", "Transferencia", 25000),
    // Mes pasado (para comparar)
    m("m18", "ingreso", -24, "Brackets: abono", "Abono", "Transferencia", 12000, "p5"),
    m("m19", "ingreso", -28, "Coronas x2", "Tratamiento", "Tarjeta", 36000),
    m("m20", "egreso", -30, "Laboratorio: coronas", "Laboratorio", "Transferencia", 14000),
    m("m21", "ingreso", -33, "Limpiezas", "Tratamiento", "Efectivo", 10000),
    m("m22", "egreso", -38, "Nómina asistente", "Nómina", "Transferencia", 22000),
    m("m23", "egreso", -43, "Alquiler del local", "Alquiler", "Transferencia", 25000),
    m("m24", "ingreso", -45, "Endodoncias x3", "Tratamiento", "Tarjeta", 36000),
  ];

  const cotizaciones: Cotizacion[] = [
    { id: "q1", numero: 1, paciente_id: "p1", fecha: d(-30), descuento_pct: 5, total: 34770, estado: "aprobada", notas: "Plan de 18 meses", ...ex,
      items: [{ nombre: "Brackets metálicos (instalación)", precio: 35000, cantidad: 1 }, { nombre: "Radiografía periapical", precio: 800, cantidad: 2 }] },
    { id: "q2", numero: 2, paciente_id: "p3", fecha: d(-3), descuento_pct: 0, total: 30000, estado: "aprobada", notas: null, ...ex,
      items: [{ nombre: "Endodoncia (tratamiento de conducto)", precio: 12000, cantidad: 1 }, { nombre: "Corona de porcelana", precio: 18000, cantidad: 1 }] },
    { id: "q3", numero: 3, paciente_id: "p4", fecha: d(-1), descuento_pct: 0, total: 9000, estado: "enviada", notas: null, ...ex,
      items: [{ nombre: "Resina (por pieza)", precio: 3000, cantidad: 3 }] },
    { id: "q4", numero: 4, paciente_id: "p6", fecha: d(-9), descuento_pct: 0, total: 18000, estado: "aprobada", notas: null, ...ex,
      items: [{ nombre: "Corona de porcelana", precio: 18000, cantidad: 1 }] },
  ];

  // ---- Clínico: panorámicas sintéticas (no son de pacientes reales) ----
  const panoramicas: Panoramica[] = [
    { id: "x1", paciente_id: "p3", storage_path: "ejemplo/p3-antes", tipo_mime: "image/svg+xml", tomada_en: d(-120), doctor_id: "d3", nota: "Evaluación inicial", ...ex },
    { id: "x2", paciente_id: "p3", storage_path: "ejemplo/p3-despues", tipo_mime: "image/svg+xml", tomada_en: d(-3), doctor_id: "d3", nota: "Control tras 1ra sesión de endodoncia", ...ex },
    { id: "x3", paciente_id: "p6", storage_path: "ejemplo/p6", tipo_mime: "image/svg+xml", tomada_en: d(-10), doctor_id: "d2", nota: "Planificación de implante", ...ex },
  ];
  const sobre = (fdi: number) => {
    const p = posicionPieza(fdi);
    return { x: Number(p.x.toFixed(4)), y: Number((p.y + (fdi > 30 ? 0.05 : -0.05)).toFixed(4)) };
  };
  const marcadores: Marcador[] = [
    { id: "k1", panoramica_id: "x2", ...sobre(36), pieza_fdi: 36, nota: "Conducto en tratamiento" },
    { id: "k2", panoramica_id: "x2", ...sobre(46), pieza_fdi: 46, nota: "Caries oclusal" },
    { id: "k3", panoramica_id: "x3", ...sobre(14), pieza_fdi: 14, nota: "Sitio del implante" },
  ];
  const ahora = new Date().toISOString();
  const pz = (paciente_id: string, pieza_fdi: number, estado: PiezaDental["estado"], situacion: PiezaDental["situacion"], nota: string | null = null): PiezaDental =>
    ({ paciente_id, pieza_fdi, estado, situacion, nota, actualizado_en: ahora });
  const piezas: PiezaDental[] = [
    pz("p3", 16, "resina", "realizado"),
    pz("p3", 18, "ausente", null),
    pz("p3", 26, "corona", "indicado", "Fractura de cúspide"),
    pz("p3", 36, "endodoncia", "indicado", "1ra sesión hecha"),
    pz("p3", 46, "caries", null, "Oclusal, profundidad media"),
    pz("p3", 48, "extraccion", null, "Cordal semi-incluida"),
    pz("p6", 14, "implante", "indicado"),
    pz("p6", 11, "corona", "realizado"),
    pz("p6", 21, "corona", "realizado"),
    pz("p6", 37, "resina", "realizado"),
  ];
  const ev = (id: string, paciente_id: string, pieza_fdi: number, estado: PiezaDental["estado"], situacion: PiezaDental["situacion"], quien: string, dia: number, nota: string | null = null): EventoPieza =>
    ({ id, paciente_id, pieza_fdi, estado, situacion, nota, quien, creado_en: `${d(dia)}T10:00:00-04:00` });
  const eventos: EventoPieza[] = [
    ev("e1", "p3", 36, "caries", null, "Dra. Carla Núñez", -120, "Caries profunda"),
    ev("e2", "p3", 36, "endodoncia", "indicado", "Dra. Carla Núñez", -10),
    ev("e3", "p3", 36, "endodoncia", "indicado", "Dra. Carla Núñez", -2, "1ra sesión hecha"),
    ev("e4", "p3", 16, "caries", null, "Dra. Carla Núñez", -120),
    ev("e5", "p3", 16, "resina", "realizado", "Dr. Miguel Taveras", -60),
    ev("e6", "p3", 46, "caries", null, "Dra. Carla Núñez", -3, "Oclusal, profundidad media"),
    ev("e7", "p6", 14, "ausente", null, "Dr. Miguel Taveras", -90),
    ev("e8", "p6", 14, "implante", "indicado", "Dr. Miguel Taveras", -10),
  ];
  const sugerencias: SugerenciaIA[] = [];

  // ---- Inventario ----
  const ar = (id: string, nombre: string, categoria: string, unidad: string, cantidad: number, minimo: number, nota: string | null = null): ArticuloInventario =>
    ({ id, nombre, categoria, unidad, cantidad, minimo, nota, activo: true, ...ex });
  const articulos: ArticuloInventario[] = [
    ar("i01", "Gomitas elásticas de ortodoncia", "Ortodoncia", "bolsas", 14, 10, "Ligas de 1/4 y 3/16"),
    ar("i02", "Ligaduras de colores", "Ortodoncia", "paquetes", 3, 5),
    ar("i03", "Brackets metálicos (kit)", "Ortodoncia", "cajas", 6, 2),
    ar("i04", "Arcos de níquel-titanio", "Ortodoncia", "paquetes", 9, 4),
    ar("i05", "Enjuague bucal", "Higiene", "botellas", 8, 6, "Clorhexidina 0.12%"),
    ar("i06", "Hilo dental", "Higiene", "unidades", 25, 15),
    ar("i07", "Cepillos dentales", "Higiene", "unidades", 0, 20, "Para kits de pacientes nuevos"),
    ar("i08", "Pasta profiláctica", "Higiene", "frascos", 4, 2),
    ar("i09", "Guantes de nitrilo (M)", "Protección", "cajas", 5, 4),
    ar("i10", "Mascarillas", "Protección", "cajas", 2, 3),
    ar("i11", "Baberos desechables", "Desechables", "paquetes", 7, 3),
    ar("i12", "Eyectores de saliva", "Desechables", "bolsas", 4, 2),
    ar("i13", "Rollos de algodón", "Desechables", "bolsas", 10, 4),
    ar("i14", "Anestesia lidocaína 2%", "Anestesia", "carpules", 46, 30),
    ar("i15", "Agujas cortas", "Anestesia", "cajas", 1, 2),
    ar("i16", "Resina compuesta A2", "Materiales", "jeringas", 5, 3),
    ar("i17", "Ácido grabador", "Materiales", "jeringas", 3, 2),
  ];
  const mi = (id: string, articulo_id: string, tipo: MovimientoInventario["tipo"], cantidad: number, resultante: number, motivo: string | null, quien: string, dia: number, hora = "10:00"): MovimientoInventario =>
    ({ id, articulo_id, tipo, cantidad, resultante, motivo, quien, creado_en: `${d(dia)}T${hora}:00-04:00` });
  const movInventario: MovimientoInventario[] = [
    mi("v1", "i01", "salida", -2, 14, "Control de brackets", "Dra. Laura Peña", 0, "09:20"),
    mi("v2", "i14", "salida", -2, 46, "Endodoncia", "Dra. Carla Núñez", -2, "14:10"),
    mi("v3", "i07", "salida", -5, 0, "Kits de bienvenida", "Carmen Reyes", -3),
    mi("v4", "i09", "entrada", 4, 5, "Compra a proveedor", "Carmen Reyes", -6, "11:30"),
    mi("v5", "i05", "entrada", 6, 8, "Compra a proveedor", "Carmen Reyes", -6, "11:35"),
  ];

  return { clinica, doctores, servicios, pacientes, citas, recordatorios, movimientos, cotizaciones, panoramicas, marcadores, piezas, eventos, sugerencias, articulos, movInventario };
}

export type DatosOperacion = ReturnType<typeof datosDeEjemplo>;
