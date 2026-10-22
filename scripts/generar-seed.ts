/**
 * Genera supabase/seed.sql desde src/datos/ejemplo.ts (una sola fuente de datos de ejemplo).
 * Uso: npm run seed:generar
 * Las fechas quedan relativas a current_date para que el ejemplo siempre luzca "de hoy".
 */
import { writeFileSync } from "node:fs";
import { datosDeEjemplo } from "../src/datos/ejemplo";
import { diferenciaDias, isoDia } from "../src/lib/fechas";

const hoy = isoDia();
const d = datosDeEjemplo(hoy);

// ids cortos del ejemplo → uuid fijo (para poder enlazar filas)
const prefijo: Record<string, string> = { d: "a", s: "e", p: "b", c: "c", m: "f", q: "d", x: "9", k: "8" };
const uuid = (id: string) => `00000000-0000-4000-8000-${prefijo[id[0]]}${id.slice(1).padStart(11, "0")}`;
const txt = (v: string | null | undefined) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);
const fecha = (iso: string) => {
  const n = diferenciaDias(hoy, iso);
  return n === 0 ? "current_date" : `current_date ${n > 0 ? "+" : "-"} ${Math.abs(n)}`;
};

const filas: string[] = [];
const insert = (tabla: string, cols: string[], valores: string[][]) =>
  filas.push(`insert into public.${tabla} (${cols.join(", ")}) values\n${valores.map((v) => `  (${v.join(", ")})`).join(",\n")};\n`);

filas.push(`-- GENERADO por scripts/generar-seed.ts · DATOS DE EJEMPLO (ficticios), todos con es_ejemplo = true.
-- Bórralos desde Ajustes o con: delete from public.pacientes where es_ejemplo; (y demás tablas)
`);
filas.push(`update public.clinica set nombre = ${txt(d.clinica.nombre)}, telefono = ${txt(d.clinica.telefono)}, direccion = ${txt(d.clinica.direccion)}, meta_ingresos_mes = ${d.clinica.meta_ingresos_mes};\n`);

insert("doctores", ["id", "nombre", "especialidad", "color", "es_ejemplo"],
  d.doctores.map((x) => [txt(uuid(x.id)), txt(x.nombre), txt(x.especialidad), txt(x.color), "true"]));
insert("servicios", ["id", "nombre", "precio", "estado_odontograma", "es_ejemplo"],
  d.servicios.map((x) => [txt(uuid(x.id)), txt(x.nombre), String(x.precio), txt(x.estado_odontograma), "true"]));
insert("pacientes", ["id", "nombre", "telefono", "fecha_nacimiento", "alergias", "notas", "doctor_principal_id", "es_ejemplo"],
  d.pacientes.map((x) => [txt(uuid(x.id)), txt(x.nombre), txt(x.telefono), txt(x.fecha_nacimiento), txt(x.alergias), txt(x.notas), x.doctor_principal_id ? txt(uuid(x.doctor_principal_id)) : "null", "true"]));
insert("citas", ["id", "paciente_id", "doctor_id", "fecha", "hora", "duracion_min", "tratamiento", "estado", "cada_dias", "es_ejemplo"],
  d.citas.map((x) => [txt(uuid(x.id)), txt(uuid(x.paciente_id)), x.doctor_id ? txt(uuid(x.doctor_id)) : "null", fecha(x.fecha), txt(x.hora), String(x.duracion_min), txt(x.tratamiento), txt(x.estado), String(x.cada_dias), "true"]));
filas.push(`-- Los recordatorios los crea el trigger. Los de fechas pasadas se marcan como enviados.
update public.recordatorios set estado = 'enviado', canal = 'bot', enviado_en = now() where fecha_envio < current_date and estado = 'pendiente';
update public.recordatorios r set estado = 'enviado', canal = 'bot', enviado_en = now() from public.citas c where c.id = r.cita_id and c.estado = 'completada';
`);
insert("movimientos_caja", ["id", "tipo", "fecha", "concepto", "categoria", "metodo", "monto", "paciente_id", "es_ejemplo"],
  d.movimientos.map((x) => [txt(uuid(x.id)), txt(x.tipo), fecha(x.fecha), txt(x.concepto), txt(x.categoria), txt(x.metodo), String(x.monto), x.paciente_id ? txt(uuid(x.paciente_id)) : "null", "true"]));
insert("cotizaciones", ["id", "numero", "paciente_id", "fecha", "descuento_pct", "total", "estado", "notas", "es_ejemplo"],
  d.cotizaciones.map((x) => [txt(uuid(x.id)), String(x.numero), txt(uuid(x.paciente_id)), fecha(x.fecha), String(x.descuento_pct), String(x.total), txt(x.estado), txt(x.notas), "true"]));
insert("cotizacion_items", ["cotizacion_id", "nombre", "precio", "cantidad", "orden"],
  d.cotizaciones.flatMap((q) => q.items.map((i, k) => [txt(uuid(q.id)), txt(i.nombre), String(i.precio), String(i.cantidad), String(k)])));
filas.push(`select setval('public.cotizacion_numero_seq', (select max(numero) from public.cotizaciones));\n`);

writeFileSync("supabase/seed.sql", filas.join("\n"));
console.log("supabase/seed.sql generado");
