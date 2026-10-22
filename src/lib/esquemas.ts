/** Validación de formularios (servidor). Mensajes en español, cortos y claros. */
import { z } from "zod";

const opcional = z.string().trim().transform((v) => (v === "" ? null : v)).nullable().optional();
const idOpcional = z.string().trim().transform((v) => (v === "" ? null : v)).nullable().optional();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha");
const hora = z.string().regex(/^\d{2}:\d{2}$/, "Elige una hora");
const dinero = z.coerce.number({ message: "Escribe un monto" }).finite("Escribe un monto");

export const esquemaPaciente = z.object({
  id: idOpcional,
  nombre: z.string().trim().min(3, "Escribe el nombre completo"),
  telefono: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d+\-\s()]/g, ""))
    .refine((v) => v === "" || v.replace(/\D/g, "").length >= 10, "El WhatsApp debe tener 10 dígitos (809, 829 u 849)")
    .transform((v) => (v === "" ? null : v)),
  fecha_nacimiento: z.string().trim().transform((v) => (v === "" ? null : v)).nullable(),
  alergias: opcional,
  notas: opcional,
  doctor_principal_id: idOpcional,
});

export const esquemaCita = z.object({
  id: idOpcional,
  paciente_id: z.string().min(1, "Elige el paciente"),
  doctor_id: z.string().min(1, "Elige el odontólogo"),
  fecha,
  hora,
  duracion_min: z.coerce.number().int().min(5, "Mínimo 5 minutos").max(600),
  tratamiento: z.string().trim().min(2, "Escribe el tratamiento"),
  cada_dias: z.coerce.number().int().min(0).max(365),
  pieza_fdi: z.coerce.number().int().optional().or(z.literal("").transform(() => undefined)),
});

export const esquemaAplazar = z.object({ id: z.string().min(1), fecha, hora });

export const CATEGORIAS = {
  ingreso: ["Consulta", "Tratamiento", "Abono", "Otro"],
  egreso: ["Insumos", "Servicios", "Laboratorio", "Nómina", "Alquiler", "Otro"],
} as const;
export const METODOS = ["Efectivo", "Tarjeta", "Transferencia"] as const;

export const esquemaMovimiento = z.object({
  id: idOpcional,
  tipo: z.enum(["ingreso", "egreso"]),
  fecha,
  concepto: z.string().trim().min(2, "Escribe el concepto"),
  categoria: z.string().min(1, "Elige la categoría"),
  metodo: z.enum(METODOS, { message: "Elige el método" }),
  monto: dinero.refine((n) => n > 0, "El monto debe ser mayor que cero"),
  paciente_id: idOpcional,
});

export const esquemaItem = z.object({
  nombre: z.string().trim().min(1),
  precio: z.coerce.number().min(0),
  cantidad: z.coerce.number().int().min(1),
  servicio_id: z.string().nullable().optional(),
  pieza_fdi: z.number().int().nullable().optional(),
});

export const esquemaCotizacion = z.object({
  id: idOpcional,
  paciente_id: z.string().min(1, "Elige el paciente"),
  descuento_pct: z.coerce.number().min(0, "El descuento va de 0 a 100").max(100, "El descuento va de 0 a 100"),
  notas: opcional,
  origen: z.enum(["manual", "ia", "odontograma"]).default("manual"),
  items: z.array(esquemaItem).min(1, "Agrega al menos un servicio"),
});

export const esquemaServicio = z.object({
  id: idOpcional,
  nombre: z.string().trim().min(2, "Escribe el nombre del servicio"),
  precio: dinero.refine((n) => n >= 0, "El precio no puede ser negativo"),
  estado_odontograma: idOpcional,
});

export const esquemaDoctor = z.object({
  id: idOpcional,
  nombre: z.string().trim().min(3, "Escribe el nombre"),
  especialidad: opcional,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).catch("#d4f75a"),
});

export const esquemaClinica = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre de la clínica"),
  telefono: opcional,
  direccion: opcional,
  meta_ingresos_mes: dinero.refine((n) => n >= 0, "La meta no puede ser negativa"),
});
