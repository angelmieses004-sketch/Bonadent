/** Tipos de las filas de la base de datos (mismos nombres que en Postgres). */

export type Rol = "admin" | "odontologo" | "recepcion";
export type EstadoCita = "programada" | "confirmada" | "aplazada" | "completada" | "cancelada";
export type TipoRecordatorio = "previo" | "hoy";
export type EstadoRecordatorio = "pendiente" | "enviado" | "fallido" | "cancelado";
export type TipoMovimiento = "ingreso" | "egreso";
export type EstadoCotizacion = "borrador" | "enviada" | "aprobada" | "rechazada";

export type DiaSemana = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

export interface Clinica {
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  meta_ingresos_mes: number;
  horario: Record<DiaSemana, [string, string] | null>;
  textos_recordatorio: { previo?: string; hoy?: string };
  ia_sugerencias: boolean;
}

export interface Doctor {
  id: string;
  nombre: string;
  especialidad: string | null;
  color: string | null;
  activo: boolean;
  es_ejemplo: boolean;
}

export interface Servicio {
  id: string;
  nombre: string;
  precio: number;
  estado_odontograma: string | null;
  activo: boolean;
  es_ejemplo: boolean;
}

export interface Paciente {
  id: string;
  nombre: string;
  telefono: string | null;
  fecha_nacimiento: string | null;
  alergias: string | null;
  notas: string | null;
  doctor_principal_id: string | null;
  es_ejemplo: boolean;
}

export interface Cita {
  id: string;
  paciente_id: string;
  doctor_id: string | null;
  fecha: string; // YYYY-MM-DD (hora local de Santo Domingo)
  hora: string; // HH:MM
  duracion_min: number;
  tratamiento: string | null;
  estado: EstadoCita;
  cada_dias: number;
  aplazamientos: number;
  es_ejemplo: boolean;
}

export interface Recordatorio {
  id: string;
  cita_id: string;
  tipo: TipoRecordatorio;
  fecha_envio: string;
  estado: EstadoRecordatorio;
  canal?: "bot" | "manual" | null;
  ultimo_error?: string | null;
  enviado_en?: string | null;
}

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  fecha: string;
  concepto: string;
  categoria: string;
  metodo: "Efectivo" | "Tarjeta" | "Transferencia";
  monto: number;
  paciente_id: string | null;
  comprobante_path?: string | null;
  es_ejemplo: boolean;
}

export interface ItemCotizacion {
  nombre: string;
  precio: number;
  cantidad: number;
  servicio_id?: string | null;
  pieza_fdi?: number | null;
}

export interface Cotizacion {
  id: string;
  numero: number;
  paciente_id: string;
  fecha: string;
  descuento_pct: number;
  total: number;
  estado: EstadoCotizacion;
  origen?: "manual" | "ia" | "odontograma";
  notas: string | null;
  es_ejemplo: boolean;
  items: ItemCotizacion[];
}

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  esSuperadmin: boolean;
  doctorId: string | null;
  vistaPrevia: boolean;
}

/* ---------- Clínico ---------- */

export type EstadoPieza = "sana" | "caries" | "resina" | "endodoncia" | "corona" | "implante" | "ausente" | "extraccion";
export type Situacion = "indicado" | "realizado";

export interface Panoramica {
  id: string;
  paciente_id: string;
  storage_path: string;
  tipo_mime: string;
  tomada_en: string;
  doctor_id: string | null;
  nota: string | null;
  es_ejemplo: boolean;
}

export interface Marcador {
  id: string;
  panoramica_id: string;
  x: number;
  y: number;
  pieza_fdi: number;
  nota: string | null;
}

export interface PiezaDental {
  paciente_id: string;
  pieza_fdi: number;
  estado: EstadoPieza;
  situacion: Situacion | null;
  nota: string | null;
  actualizado_en: string;
}

export interface EventoPieza {
  id: string;
  paciente_id: string;
  pieza_fdi: number;
  estado: EstadoPieza;
  situacion: Situacion | null;
  nota: string | null;
  quien: string;
  creado_en: string;
}

export interface SugerenciaIA {
  id: string;
  panoramica_id: string;
  x: number;
  y: number;
  radio: number;
  pieza_fdi: number | null;
  estado_sugerido: EstadoPieza | null;
  descripcion: string;
  confianza: number;
  decision: "pendiente" | "aceptada" | "descartada";
}

export interface EntradaAuditoria {
  id: string;
  en: string;
  quien: string;
  tabla: string;
  registro_id: string | null;
  accion: "crear" | "editar" | "borrar" | "ver";
}

/* ---------- Inventario ---------- */

export interface ArticuloInventario {
  id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidad: number;
  minimo: number;
  nota: string | null;
  activo: boolean;
  es_ejemplo: boolean;
}

export interface MovimientoInventario {
  id: string;
  articulo_id: string;
  tipo: "entrada" | "salida" | "ajuste";
  cantidad: number;
  resultante: number;
  motivo: string | null;
  quien: string;
  creado_en: string;
}
