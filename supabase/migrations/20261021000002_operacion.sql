-- =====================================================================
-- Bonadent · 0002 Operación: servicios, pacientes, citas, recordatorios,
-- caja y cotizaciones.
-- Fechas de cita en hora local de Santo Domingo (date + time).
-- =====================================================================

create type public.estado_cita as enum ('programada', 'confirmada', 'aplazada', 'completada', 'cancelada');
create type public.tipo_recordatorio as enum ('previo', 'hoy');
create type public.estado_recordatorio as enum ('pendiente', 'enviado', 'fallido', 'cancelado');
create type public.tipo_movimiento as enum ('ingreso', 'egreso');
create type public.estado_cotizacion as enum ('borrador', 'enviada', 'aprobada', 'rechazada');

-- ---------------------------------------------------------------------
-- Catálogo de servicios
-- estado_odontograma: estado de pieza que este servicio resuelve (Fase 4)
-- ---------------------------------------------------------------------
create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  precio numeric(12,2) not null check (precio >= 0),
  estado_odontograma text,
  activo boolean not null default true,
  es_ejemplo boolean not null default false,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Pacientes
-- ---------------------------------------------------------------------
create table public.pacientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  telefono text,
  fecha_nacimiento date,
  alergias text,
  notas text,
  doctor_principal_id uuid references public.doctores (id) on delete set null,
  es_ejemplo boolean not null default false,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index pacientes_nombre on public.pacientes using gin (to_tsvector('simple', nombre));

-- ---------------------------------------------------------------------
-- Citas
-- ---------------------------------------------------------------------
create table public.citas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  doctor_id uuid references public.doctores (id) on delete set null,
  fecha date not null,
  hora time not null,
  duracion_min integer not null default 30 check (duracion_min between 5 and 600),
  tratamiento text,
  estado public.estado_cita not null default 'programada',
  cada_dias integer not null default 0 check (cada_dias >= 0),
  cita_origen_id uuid references public.citas (id) on delete set null,
  aplazamientos integer not null default 0,
  pieza_fdi smallint,
  es_ejemplo boolean not null default false,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index citas_fecha_doctor on public.citas (fecha, doctor_id);
create index citas_paciente on public.citas (paciente_id);

-- ---------------------------------------------------------------------
-- Recordatorios: dos por cita (3 días antes y el mismo día)
-- Se crean y reprograman solos con un trigger sobre citas.
-- ---------------------------------------------------------------------
create table public.recordatorios (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references public.citas (id) on delete cascade,
  tipo public.tipo_recordatorio not null,
  fecha_envio date not null,
  estado public.estado_recordatorio not null default 'pendiente',
  intentos integer not null default 0,
  ultimo_error text,
  enviado_en timestamptz,
  canal text check (canal in ('bot', 'manual')),
  actualizado_en timestamptz not null default now(),
  unique (cita_id, tipo)
);
create index recordatorios_pendientes on public.recordatorios (fecha_envio) where estado = 'pendiente';

create function public.sincronizar_recordatorios() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  reprogramar boolean := false;
begin
  if new.estado in ('programada', 'confirmada', 'aplazada') then
    if tg_op = 'INSERT' then
      reprogramar := true;
    elsif new.fecha <> old.fecha or new.hora <> old.hora
          or old.estado not in ('programada', 'confirmada', 'aplazada') then
      reprogramar := true;
    end if;

    if reprogramar then
      insert into public.recordatorios (cita_id, tipo, fecha_envio)
      values (new.id, 'previo', new.fecha - 3), (new.id, 'hoy', new.fecha)
      on conflict (cita_id, tipo) do update
        set fecha_envio = excluded.fecha_envio, estado = 'pendiente', intentos = 0,
            ultimo_error = null, enviado_en = null, canal = null, actualizado_en = now();
    end if;
  else
    update public.recordatorios set estado = 'cancelado', actualizado_en = now()
    where cita_id = new.id and estado in ('pendiente', 'fallido');
  end if;
  return new;
end $$;

create trigger sincronizar_recordatorios after insert or update of fecha, hora, estado on public.citas
  for each row execute function public.sincronizar_recordatorios();

-- ---------------------------------------------------------------------
-- Caja
-- ---------------------------------------------------------------------
create table public.movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_movimiento not null,
  fecha date not null,
  concepto text not null check (length(trim(concepto)) > 0),
  categoria text not null,
  metodo text not null check (metodo in ('Efectivo', 'Tarjeta', 'Transferencia')),
  monto numeric(12,2) not null check (monto > 0),
  paciente_id uuid references public.pacientes (id) on delete set null,
  comprobante_path text,
  es_ejemplo boolean not null default false,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index movimientos_fecha on public.movimientos_caja (fecha);
create index movimientos_paciente on public.movimientos_caja (paciente_id);

-- ---------------------------------------------------------------------
-- Cotizaciones (COT-0001…)
-- ---------------------------------------------------------------------
create sequence public.cotizacion_numero_seq;

create table public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique default nextval('public.cotizacion_numero_seq'),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  fecha date not null,
  descuento_pct numeric(5,2) not null default 0 check (descuento_pct between 0 and 100),
  total numeric(12,2) not null default 0 check (total >= 0),
  estado public.estado_cotizacion not null default 'borrador',
  origen text not null default 'manual' check (origen in ('manual', 'ia', 'odontograma')),
  notas text,
  es_ejemplo boolean not null default false,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
alter sequence public.cotizacion_numero_seq owned by public.cotizaciones.numero;

create table public.cotizacion_items (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizaciones (id) on delete cascade,
  servicio_id uuid references public.servicios (id) on delete set null,
  nombre text not null,
  precio numeric(12,2) not null check (precio >= 0),
  cantidad integer not null default 1 check (cantidad > 0),
  pieza_fdi smallint,
  orden integer not null default 0
);

-- ---------------------------------------------------------------------
-- Saldo del paciente = cotizaciones aprobadas − ingresos del paciente
-- ---------------------------------------------------------------------
create view public.v_saldos with (security_invoker = true) as
select
  p.id as paciente_id,
  coalesce((select sum(q.total) from public.cotizaciones q where q.paciente_id = p.id and q.estado = 'aprobada'), 0)
  - coalesce((select sum(m.monto) from public.movimientos_caja m where m.paciente_id = p.id and m.tipo = 'ingreso'), 0)
  as saldo
from public.pacientes p;

-- ---------------------------------------------------------------------
-- Auditoría y actualizado_en
-- ---------------------------------------------------------------------
create trigger auditar after insert or update or delete on public.servicios for each row execute function public.auditar();
create trigger auditar after insert or update or delete on public.pacientes for each row execute function public.auditar();
create trigger auditar after insert or update or delete on public.citas for each row execute function public.auditar();
create trigger auditar after insert or update or delete on public.movimientos_caja for each row execute function public.auditar();
create trigger auditar after insert or update or delete on public.cotizaciones for each row execute function public.auditar();
create trigger auditar after insert or update or delete on public.cotizacion_items for each row execute function public.auditar();
create trigger auditar after update on public.recordatorios for each row execute function public.auditar();

create trigger tocar before update on public.servicios for each row execute function public.tocar_actualizado();
create trigger tocar before update on public.pacientes for each row execute function public.tocar_actualizado();
create trigger tocar before update on public.citas for each row execute function public.tocar_actualizado();
create trigger tocar before update on public.movimientos_caja for each row execute function public.tocar_actualizado();
create trigger tocar before update on public.cotizaciones for each row execute function public.tocar_actualizado();
create trigger tocar before update on public.recordatorios for each row execute function public.tocar_actualizado();

-- ---------------------------------------------------------------------
-- RLS
--   admin: todo · odontólogo: pacientes, agenda, cotizaciones (sin caja)
--   recepción: pacientes, agenda, recordatorios, caja, cotizaciones
-- ---------------------------------------------------------------------
alter table public.servicios enable row level security;
alter table public.pacientes enable row level security;
alter table public.citas enable row level security;
alter table public.recordatorios enable row level security;
alter table public.movimientos_caja enable row level security;
alter table public.cotizaciones enable row level security;
alter table public.cotizacion_items enable row level security;

create policy "staff ve servicios" on public.servicios for select to authenticated using (public.es_staff());
create policy "admin gestiona servicios" on public.servicios for all to authenticated
  using (public.tiene_rol('admin')) with check (public.tiene_rol('admin'));

create policy "staff ve pacientes" on public.pacientes for select to authenticated using (public.es_staff());
create policy "staff crea pacientes" on public.pacientes for insert to authenticated with check (public.es_staff());
create policy "staff edita pacientes" on public.pacientes for update to authenticated using (public.es_staff()) with check (public.es_staff());
create policy "admin borra pacientes" on public.pacientes for delete to authenticated using (public.tiene_rol('admin'));

create policy "staff ve citas" on public.citas for select to authenticated using (public.es_staff());
create policy "staff crea citas" on public.citas for insert to authenticated with check (public.es_staff());
create policy "staff edita citas" on public.citas for update to authenticated using (public.es_staff()) with check (public.es_staff());
create policy "admin y recepción borran citas" on public.citas for delete to authenticated using (public.tiene_rol('admin', 'recepcion'));

create policy "staff ve recordatorios" on public.recordatorios for select to authenticated using (public.es_staff());
create policy "admin y recepción marcan recordatorios" on public.recordatorios for update to authenticated
  using (public.tiene_rol('admin', 'recepcion')) with check (public.tiene_rol('admin', 'recepcion'));

create policy "caja: admin y recepción" on public.movimientos_caja for all to authenticated
  using (public.tiene_rol('admin', 'recepcion')) with check (public.tiene_rol('admin', 'recepcion'));

create policy "staff ve cotizaciones" on public.cotizaciones for select to authenticated using (public.es_staff());
create policy "staff crea cotizaciones" on public.cotizaciones for insert to authenticated with check (public.es_staff());
create policy "staff edita cotizaciones" on public.cotizaciones for update to authenticated using (public.es_staff()) with check (public.es_staff());
create policy "admin y recepción borran cotizaciones" on public.cotizaciones for delete to authenticated using (public.tiene_rol('admin', 'recepcion'));

create policy "staff gestiona items" on public.cotizacion_items for all to authenticated
  using (public.es_staff()) with check (public.es_staff());
