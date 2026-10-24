-- GENERADO por scripts/generar-seed.ts · DATOS DE EJEMPLO (ficticios), todos con es_ejemplo = true.
-- Bórralos desde Ajustes o con: delete from public.pacientes where es_ejemplo; (y demás tablas)

update public.clinica set nombre = 'Clínica Dental Sonrisa', telefono = '809-555-0100', direccion = 'Calle del Sol #45, Santiago', meta_ingresos_mes = 150000;

insert into public.doctores (id, nombre, especialidad, color, es_ejemplo) values
  ('00000000-0000-4000-8000-a00000000001', 'Dra. Laura Peña', 'Ortodoncia', '#d4f75a', true),
  ('00000000-0000-4000-8000-a00000000002', 'Dr. Miguel Taveras', 'Odontología general', '#8fa2ff', true),
  ('00000000-0000-4000-8000-a00000000003', 'Dra. Carla Núñez', 'Endodoncia', '#ff8a5b', true);

insert into public.servicios (id, nombre, precio, estado_odontograma, es_ejemplo) values
  ('00000000-0000-4000-8000-e00000000001', 'Consulta y evaluación', 1500, null, true),
  ('00000000-0000-4000-8000-e00000000002', 'Limpieza (profilaxis)', 2500, null, true),
  ('00000000-0000-4000-8000-e00000000003', 'Resina (por pieza)', 3000, 'caries', true),
  ('00000000-0000-4000-8000-e00000000004', 'Extracción simple', 2500, 'extraccion', true),
  ('00000000-0000-4000-8000-e00000000005', 'Endodoncia (tratamiento de conducto)', 12000, 'endodoncia', true),
  ('00000000-0000-4000-8000-e00000000006', 'Corona de porcelana', 18000, 'corona', true),
  ('00000000-0000-4000-8000-e00000000007', 'Blanqueamiento', 9000, null, true),
  ('00000000-0000-4000-8000-e00000000008', 'Brackets metálicos (instalación)', 35000, null, true),
  ('00000000-0000-4000-8000-e00000000009', 'Control de brackets', 2000, null, true),
  ('00000000-0000-4000-8000-e00000000010', 'Radiografía periapical', 800, null, true),
  ('00000000-0000-4000-8000-e00000000011', 'Implante dental', 85000, 'implante', true),
  ('00000000-0000-4000-8000-e00000000012', 'Reconstrucción con resina', 4500, null, true),
  ('00000000-0000-4000-8000-e00000000013', 'Perno de fibra de vidrio', 5000, null, true);

insert into public.pacientes (id, nombre, telefono, fecha_nacimiento, alergias, notas, doctor_principal_id, es_ejemplo) values
  ('00000000-0000-4000-8000-b00000000001', 'Ana Rodríguez', '809-555-0111', '1996-04-12', null, 'Brackets, control cada 15 días', '00000000-0000-4000-8000-a00000000001', true),
  ('00000000-0000-4000-8000-b00000000002', 'José Almonte', '829-555-0122', '1988-09-03', null, null, '00000000-0000-4000-8000-a00000000002', true),
  ('00000000-0000-4000-8000-b00000000003', 'María Fernández', '849-555-0133', '1979-01-25', 'Penicilina', null, '00000000-0000-4000-8000-a00000000003', true),
  ('00000000-0000-4000-8000-b00000000004', 'Pedro Sánchez', '809-555-0144', '2001-06-30', null, null, '00000000-0000-4000-8000-a00000000002', true),
  ('00000000-0000-4000-8000-b00000000005', 'Lucía Batista', '829-555-0155', '2010-11-18', null, null, '00000000-0000-4000-8000-a00000000001', true),
  ('00000000-0000-4000-8000-b00000000006', 'Ramón Guzmán', '809-555-0166', '1965-02-08', null, null, '00000000-0000-4000-8000-a00000000003', true);

insert into public.citas (id, paciente_id, doctor_id, fecha, hora, duracion_min, tratamiento, estado, cada_dias, es_ejemplo) values
  ('00000000-0000-4000-8000-c00000000001', '00000000-0000-4000-8000-b00000000001', '00000000-0000-4000-8000-a00000000001', current_date, '09:00', 30, 'Control de brackets', 'confirmada', 15, true),
  ('00000000-0000-4000-8000-c00000000002', '00000000-0000-4000-8000-b00000000002', '00000000-0000-4000-8000-a00000000002', current_date, '10:30', 45, 'Limpieza', 'programada', 0, true),
  ('00000000-0000-4000-8000-c00000000003', '00000000-0000-4000-8000-b00000000003', '00000000-0000-4000-8000-a00000000003', current_date, '15:00', 90, 'Endodoncia 2da sesión', 'programada', 0, true),
  ('00000000-0000-4000-8000-c00000000008', '00000000-0000-4000-8000-b00000000006', '00000000-0000-4000-8000-a00000000002', current_date, '17:00', 30, 'Evaluación de implante', 'confirmada', 0, true),
  ('00000000-0000-4000-8000-c00000000004', '00000000-0000-4000-8000-b00000000004', '00000000-0000-4000-8000-a00000000002', current_date + 3, '11:00', 30, 'Resinas', 'programada', 0, true),
  ('00000000-0000-4000-8000-c00000000005', '00000000-0000-4000-8000-b00000000005', '00000000-0000-4000-8000-a00000000001', current_date + 3, '16:00', 30, 'Evaluación de ortodoncia', 'programada', 0, true),
  ('00000000-0000-4000-8000-c00000000006', '00000000-0000-4000-8000-b00000000002', '00000000-0000-4000-8000-a00000000002', current_date + 2, '09:30', 30, 'Extracción', 'programada', 0, true),
  ('00000000-0000-4000-8000-c00000000009', '00000000-0000-4000-8000-b00000000006', '00000000-0000-4000-8000-a00000000003', current_date + 5, '10:00', 60, 'Corona: toma de impresión', 'programada', 0, true),
  ('00000000-0000-4000-8000-c00000000010', '00000000-0000-4000-8000-b00000000003', '00000000-0000-4000-8000-a00000000003', current_date + 9, '15:00', 30, 'Control de endodoncia', 'programada', 0, true),
  ('00000000-0000-4000-8000-c00000000011', '00000000-0000-4000-8000-b00000000004', '00000000-0000-4000-8000-a00000000001', current_date + 11, '08:30', 60, 'Blanqueamiento', 'programada', 0, true),
  ('00000000-0000-4000-8000-c00000000012', '00000000-0000-4000-8000-b00000000005', '00000000-0000-4000-8000-a00000000001', current_date + 16, '16:00', 90, 'Instalación de brackets', 'programada', 0, true),
  ('00000000-0000-4000-8000-c00000000007', '00000000-0000-4000-8000-b00000000001', '00000000-0000-4000-8000-a00000000001', current_date - 15, '09:00', 30, 'Control de brackets', 'completada', 0, true),
  ('00000000-0000-4000-8000-c00000000013', '00000000-0000-4000-8000-b00000000002', '00000000-0000-4000-8000-a00000000002', current_date - 6, '11:00', 30, 'Consulta', 'completada', 0, true),
  ('00000000-0000-4000-8000-c00000000014', '00000000-0000-4000-8000-b00000000004', '00000000-0000-4000-8000-a00000000002', current_date - 4, '10:00', 45, 'Limpieza', 'completada', 0, true),
  ('00000000-0000-4000-8000-c00000000015', '00000000-0000-4000-8000-b00000000003', '00000000-0000-4000-8000-a00000000003', current_date - 2, '14:00', 90, 'Endodoncia 1ra sesión', 'completada', 0, true),
  ('00000000-0000-4000-8000-c00000000016', '00000000-0000-4000-8000-b00000000005', '00000000-0000-4000-8000-a00000000001', current_date - 1, '16:00', 30, 'Consulta', 'completada', 0, true);

-- Los recordatorios los crea el trigger. Los de fechas pasadas se marcan como enviados.
update public.recordatorios set estado = 'enviado', canal = 'bot', enviado_en = now() where fecha_envio < current_date and estado = 'pendiente';
update public.recordatorios r set estado = 'enviado', canal = 'bot', enviado_en = now() from public.citas c where c.id = r.cita_id and c.estado = 'completada';

insert into public.movimientos_caja (id, tipo, fecha, concepto, categoria, metodo, monto, paciente_id, es_ejemplo) values
  ('00000000-0000-4000-8000-f00000000001', 'ingreso', current_date, 'Abono brackets', 'Abono', 'Transferencia', 5000, '00000000-0000-4000-8000-b00000000001', true),
  ('00000000-0000-4000-8000-f00000000002', 'egreso', current_date, 'Botellón de agua', 'Servicios', 'Efectivo', 1000, null, true),
  ('00000000-0000-4000-8000-f00000000003', 'ingreso', current_date - 1, 'Consulta', 'Consulta', 'Efectivo', 1500, '00000000-0000-4000-8000-b00000000005', true),
  ('00000000-0000-4000-8000-f00000000004', 'egreso', current_date - 1, 'Guantes y mascarillas', 'Insumos', 'Tarjeta', 4200, null, true),
  ('00000000-0000-4000-8000-f00000000005', 'ingreso', current_date - 2, 'Endodoncia 1ra sesión', 'Tratamiento', 'Tarjeta', 6000, '00000000-0000-4000-8000-b00000000003', true),
  ('00000000-0000-4000-8000-f00000000006', 'egreso', current_date - 3, 'Laboratorio: corona', 'Laboratorio', 'Transferencia', 7500, null, true),
  ('00000000-0000-4000-8000-f00000000007', 'ingreso', current_date - 4, 'Limpieza', 'Tratamiento', 'Efectivo', 2500, '00000000-0000-4000-8000-b00000000004', true),
  ('00000000-0000-4000-8000-f00000000008', 'ingreso', current_date - 15, 'Inicial brackets', 'Abono', 'Transferencia', 15000, '00000000-0000-4000-8000-b00000000001', true),
  ('00000000-0000-4000-8000-f00000000009', 'ingreso', current_date - 5, 'Resinas x2', 'Tratamiento', 'Tarjeta', 6000, '00000000-0000-4000-8000-b00000000002', true),
  ('00000000-0000-4000-8000-f00000000010', 'ingreso', current_date - 6, 'Consulta', 'Consulta', 'Efectivo', 1500, '00000000-0000-4000-8000-b00000000002', true),
  ('00000000-0000-4000-8000-f00000000011', 'egreso', current_date - 6, 'Pago de luz', 'Servicios', 'Transferencia', 3800, null, true),
  ('00000000-0000-4000-8000-f00000000012', 'ingreso', current_date - 8, 'Blanqueamiento', 'Tratamiento', 'Tarjeta', 9000, '00000000-0000-4000-8000-b00000000006', true),
  ('00000000-0000-4000-8000-f00000000013', 'ingreso', current_date - 9, 'Abono corona', 'Abono', 'Transferencia', 8000, '00000000-0000-4000-8000-b00000000006', true),
  ('00000000-0000-4000-8000-f00000000014', 'egreso', current_date - 10, 'Compra de resinas', 'Insumos', 'Tarjeta', 5600, null, true),
  ('00000000-0000-4000-8000-f00000000015', 'ingreso', current_date - 11, 'Extracción', 'Tratamiento', 'Efectivo', 2500, '00000000-0000-4000-8000-b00000000004', true),
  ('00000000-0000-4000-8000-f00000000016', 'ingreso', current_date - 12, 'Limpieza', 'Tratamiento', 'Efectivo', 2500, '00000000-0000-4000-8000-b00000000005', true),
  ('00000000-0000-4000-8000-f00000000017', 'egreso', current_date - 13, 'Alquiler del local', 'Alquiler', 'Transferencia', 25000, null, true),
  ('00000000-0000-4000-8000-f00000000018', 'ingreso', current_date - 25, 'Brackets: abono', 'Abono', 'Transferencia', 12000, '00000000-0000-4000-8000-b00000000005', true),
  ('00000000-0000-4000-8000-f00000000019', 'ingreso', current_date - 29, 'Coronas x2', 'Tratamiento', 'Tarjeta', 36000, null, true),
  ('00000000-0000-4000-8000-f00000000020', 'egreso', current_date - 31, 'Laboratorio: coronas', 'Laboratorio', 'Transferencia', 14000, null, true),
  ('00000000-0000-4000-8000-f00000000021', 'ingreso', current_date - 34, 'Limpiezas', 'Tratamiento', 'Efectivo', 10000, null, true),
  ('00000000-0000-4000-8000-f00000000022', 'egreso', current_date - 39, 'Nómina asistente', 'Nómina', 'Transferencia', 22000, null, true),
  ('00000000-0000-4000-8000-f00000000023', 'egreso', current_date - 44, 'Alquiler del local', 'Alquiler', 'Transferencia', 25000, null, true),
  ('00000000-0000-4000-8000-f00000000024', 'ingreso', current_date - 46, 'Endodoncias x3', 'Tratamiento', 'Tarjeta', 36000, null, true);

insert into public.cotizaciones (id, numero, paciente_id, fecha, descuento_pct, total, estado, notas, es_ejemplo) values
  ('00000000-0000-4000-8000-d00000000001', 1, '00000000-0000-4000-8000-b00000000001', current_date - 31, 5, 34770, 'aprobada', 'Plan de 18 meses', true),
  ('00000000-0000-4000-8000-d00000000002', 2, '00000000-0000-4000-8000-b00000000003', current_date - 3, 0, 30000, 'aprobada', null, true),
  ('00000000-0000-4000-8000-d00000000003', 3, '00000000-0000-4000-8000-b00000000004', current_date - 1, 0, 9000, 'enviada', null, true),
  ('00000000-0000-4000-8000-d00000000004', 4, '00000000-0000-4000-8000-b00000000006', current_date - 9, 0, 18000, 'aprobada', null, true);

insert into public.cotizacion_items (cotizacion_id, nombre, precio, cantidad, orden) values
  ('00000000-0000-4000-8000-d00000000001', 'Brackets metálicos (instalación)', 35000, 1, 0),
  ('00000000-0000-4000-8000-d00000000001', 'Radiografía periapical', 800, 2, 1),
  ('00000000-0000-4000-8000-d00000000002', 'Endodoncia (tratamiento de conducto)', 12000, 1, 0),
  ('00000000-0000-4000-8000-d00000000002', 'Corona de porcelana', 18000, 1, 1),
  ('00000000-0000-4000-8000-d00000000003', 'Resina (por pieza)', 3000, 3, 0),
  ('00000000-0000-4000-8000-d00000000004', 'Corona de porcelana', 18000, 1, 0);

select setval('public.cotizacion_numero_seq', (select max(numero) from public.cotizaciones));

insert into public.panoramicas (id, paciente_id, storage_path, tipo_mime, tomada_en, doctor_id, nota, es_ejemplo) values
  ('00000000-0000-4000-8000-900000000001', '00000000-0000-4000-8000-b00000000003', 'ejemplo/p3-antes', 'image/svg+xml', current_date - 121, '00000000-0000-4000-8000-a00000000003', 'Evaluación inicial', true),
  ('00000000-0000-4000-8000-900000000002', '00000000-0000-4000-8000-b00000000003', 'ejemplo/p3-despues', 'image/svg+xml', current_date - 3, '00000000-0000-4000-8000-a00000000003', 'Control tras 1ra sesión de endodoncia', true),
  ('00000000-0000-4000-8000-900000000003', '00000000-0000-4000-8000-b00000000006', 'ejemplo/p6', 'image/svg+xml', current_date - 10, '00000000-0000-4000-8000-a00000000002', 'Planificación de implante', true);

insert into public.marcadores (id, panoramica_id, x, y, pieza_fdi, nota) values
  ('00000000-0000-4000-8000-800000000001', '00000000-0000-4000-8000-900000000002', 0.7567, 0.5527, 36, 'Conducto en tratamiento'),
  ('00000000-0000-4000-8000-800000000002', '00000000-0000-4000-8000-900000000002', 0.2433, 0.5527, 46, 'Caries oclusal'),
  ('00000000-0000-4000-8000-800000000003', '00000000-0000-4000-8000-900000000003', 0.3367, 0.4119, 14, 'Sitio del implante');

insert into public.odontograma_piezas (paciente_id, pieza_fdi, estado, situacion, nota) values
  ('00000000-0000-4000-8000-b00000000003', 16, 'resina', 'realizado', null),
  ('00000000-0000-4000-8000-b00000000003', 18, 'ausente', null, null),
  ('00000000-0000-4000-8000-b00000000003', 26, 'corona', 'indicado', 'Fractura de cúspide'),
  ('00000000-0000-4000-8000-b00000000003', 36, 'endodoncia', 'indicado', '1ra sesión hecha'),
  ('00000000-0000-4000-8000-b00000000003', 46, 'caries', null, 'Oclusal, profundidad media'),
  ('00000000-0000-4000-8000-b00000000003', 48, 'extraccion', null, 'Cordal semi-incluida'),
  ('00000000-0000-4000-8000-b00000000006', 14, 'implante', 'indicado', null),
  ('00000000-0000-4000-8000-b00000000006', 11, 'corona', 'realizado', null),
  ('00000000-0000-4000-8000-b00000000006', 21, 'corona', 'realizado', null),
  ('00000000-0000-4000-8000-b00000000006', 37, 'resina', 'realizado', null);

insert into public.inventario_articulos (id, nombre, categoria, unidad, cantidad, minimo, nota, es_ejemplo) values
  ('00000000-0000-4000-8000-700000000001', 'Gomitas elásticas de ortodoncia', 'Ortodoncia', 'bolsas', 14, 10, 'Ligas de 1/4 y 3/16', true),
  ('00000000-0000-4000-8000-700000000002', 'Ligaduras de colores', 'Ortodoncia', 'paquetes', 3, 5, null, true),
  ('00000000-0000-4000-8000-700000000003', 'Brackets metálicos (kit)', 'Ortodoncia', 'cajas', 6, 2, null, true),
  ('00000000-0000-4000-8000-700000000004', 'Arcos de níquel-titanio', 'Ortodoncia', 'paquetes', 9, 4, null, true),
  ('00000000-0000-4000-8000-700000000005', 'Enjuague bucal', 'Higiene', 'botellas', 8, 6, 'Clorhexidina 0.12%', true),
  ('00000000-0000-4000-8000-700000000006', 'Hilo dental', 'Higiene', 'unidades', 25, 15, null, true),
  ('00000000-0000-4000-8000-700000000007', 'Cepillos dentales', 'Higiene', 'unidades', 0, 20, 'Para kits de pacientes nuevos', true),
  ('00000000-0000-4000-8000-700000000008', 'Pasta profiláctica', 'Higiene', 'frascos', 4, 2, null, true),
  ('00000000-0000-4000-8000-700000000009', 'Guantes de nitrilo (M)', 'Protección', 'cajas', 5, 4, null, true),
  ('00000000-0000-4000-8000-700000000010', 'Mascarillas', 'Protección', 'cajas', 2, 3, null, true),
  ('00000000-0000-4000-8000-700000000011', 'Baberos desechables', 'Desechables', 'paquetes', 7, 3, null, true),
  ('00000000-0000-4000-8000-700000000012', 'Eyectores de saliva', 'Desechables', 'bolsas', 4, 2, null, true),
  ('00000000-0000-4000-8000-700000000013', 'Rollos de algodón', 'Desechables', 'bolsas', 10, 4, null, true),
  ('00000000-0000-4000-8000-700000000014', 'Anestesia lidocaína 2%', 'Anestesia', 'carpules', 46, 30, null, true),
  ('00000000-0000-4000-8000-700000000015', 'Agujas cortas', 'Anestesia', 'cajas', 1, 2, null, true),
  ('00000000-0000-4000-8000-700000000016', 'Resina compuesta A2', 'Materiales', 'jeringas', 5, 3, null, true),
  ('00000000-0000-4000-8000-700000000017', 'Ácido grabador', 'Materiales', 'jeringas', 3, 2, null, true);

insert into public.inventario_movimientos (articulo_id, tipo, cantidad, resultante, motivo)
select id, 'entrada', cantidad, cantidad, 'Existencia inicial' from public.inventario_articulos where es_ejemplo;
