-- =====================================================================
-- Bonadent · 0001 Base: clínica, equipo, roles, invitaciones y auditoría
-- Software para UNA clínica. Todas las tablas con RLS activado.
-- =====================================================================

create extension if not exists pgcrypto;

create type public.rol_usuario as enum ('admin', 'odontologo', 'recepcion');

-- ---------------------------------------------------------------------
-- Clínica (una sola fila)
-- ---------------------------------------------------------------------
create table public.clinica (
  id boolean primary key default true check (id),
  nombre text not null default 'Clínica Dental',
  telefono text,
  direccion text,
  logo_path text,
  horario jsonb not null default '{
    "lun": ["08:00","18:00"], "mar": ["08:00","18:00"], "mie": ["08:00","18:00"],
    "jue": ["08:00","18:00"], "vie": ["08:00","18:00"], "sab": ["08:00","13:00"], "dom": null
  }'::jsonb,
  textos_recordatorio jsonb not null default '{}'::jsonb,
  meta_ingresos_mes numeric(12,2) not null default 0 check (meta_ingresos_mes >= 0),
  actualizado_en timestamptz not null default now()
);
insert into public.clinica default values;

-- ---------------------------------------------------------------------
-- Odontólogos (pueden existir sin cuenta de usuario)
-- ---------------------------------------------------------------------
create table public.doctores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  especialidad text,
  color text,
  activo boolean not null default true,
  es_ejemplo boolean not null default false,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Perfiles del equipo (1:1 con auth.users)
-- ---------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  correo text not null,
  rol public.rol_usuario not null,
  doctor_id uuid references public.doctores (id) on delete set null,
  es_superadmin boolean not null default false,  -- equipo de Rido
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Invitaciones: solo quien fue invitado obtiene perfil al registrarse
-- ---------------------------------------------------------------------
create table public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  nombre text not null,
  rol public.rol_usuario not null,
  doctor_id uuid references public.doctores (id) on delete set null,
  invitado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  aceptada_en timestamptz
);
create unique index invitaciones_correo_pendiente on public.invitaciones (lower(correo)) where aceptada_en is null;

-- ---------------------------------------------------------------------
-- Auditoría: quién creó, editó, borró o vio qué y cuándo
-- ---------------------------------------------------------------------
create table public.auditoria (
  id bigint generated always as identity primary key,
  en timestamptz not null default now(),
  usuario_id uuid default auth.uid(),
  tabla text not null,
  registro_id text,
  accion text not null check (accion in ('crear', 'editar', 'borrar', 'ver')),
  antes jsonb,
  despues jsonb
);
create index auditoria_tabla_registro on public.auditoria (tabla, registro_id);
create index auditoria_en on public.auditoria (en desc);

-- ---------------------------------------------------------------------
-- Funciones auxiliares de permisos (security definer: leen perfiles sin RLS)
-- ---------------------------------------------------------------------
create function public.rol_actual() returns public.rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid() and activo
$$;

create function public.es_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo)
$$;

create function public.tiene_rol(variadic roles public.rol_usuario[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_actual() = any (roles), false)
$$;

-- Trigger genérico de auditoría
create function public.auditar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  fila jsonb;
begin
  if tg_op = 'DELETE' then
    fila := to_jsonb(old);
    insert into public.auditoria (tabla, registro_id, accion, antes)
    values (tg_table_name, fila ->> 'id', 'borrar', fila);
    return old;
  elsif tg_op = 'UPDATE' then
    fila := to_jsonb(new);
    insert into public.auditoria (tabla, registro_id, accion, antes, despues)
    values (tg_table_name, fila ->> 'id', 'editar', to_jsonb(old), fila);
    return new;
  else
    fila := to_jsonb(new);
    insert into public.auditoria (tabla, registro_id, accion, despues)
    values (tg_table_name, fila ->> 'id', 'crear', fila);
    return new;
  end if;
end $$;

-- Registro de "ver" (lo llama la app al abrir datos sensibles, p. ej. una panorámica)
create function public.registrar_vista(p_tabla text, p_registro text) returns void
language sql security definer set search_path = public as $$
  insert into public.auditoria (tabla, registro_id, accion)
  select p_tabla, p_registro, 'ver' where public.es_staff()
$$;

-- Mantiene actualizado_en
create function public.tocar_actualizado() returns trigger
language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

-- Crea el perfil cuando un invitado acepta (y solo si fue invitado)
create function public.al_crear_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv public.invitaciones;
begin
  select * into inv from public.invitaciones
  where lower(correo) = lower(new.email) and aceptada_en is null
  order by creado_en desc limit 1;

  if found then
    insert into public.perfiles (id, nombre, correo, rol, doctor_id)
    values (new.id, inv.nombre, new.email, inv.rol, inv.doctor_id)
    on conflict (id) do nothing;
    update public.invitaciones set aceptada_en = now() where id = inv.id;
  end if;
  return new;
end $$;

create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.al_crear_usuario();

-- Triggers de auditoría y actualizado_en
create trigger auditar after insert or update or delete on public.clinica for each row execute function public.auditar();
create trigger auditar after insert or update or delete on public.doctores for each row execute function public.auditar();
create trigger auditar after insert or update or delete on public.perfiles for each row execute function public.auditar();
create trigger auditar after insert or update or delete on public.invitaciones for each row execute function public.auditar();
create trigger tocar before update on public.clinica for each row execute function public.tocar_actualizado();
create trigger tocar before update on public.doctores for each row execute function public.tocar_actualizado();
create trigger tocar before update on public.perfiles for each row execute function public.tocar_actualizado();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.clinica enable row level security;
alter table public.doctores enable row level security;
alter table public.perfiles enable row level security;
alter table public.invitaciones enable row level security;
alter table public.auditoria enable row level security;

create policy "staff ve la clínica" on public.clinica for select to authenticated using (public.es_staff());
create policy "admin edita la clínica" on public.clinica for update to authenticated using (public.tiene_rol('admin')) with check (public.tiene_rol('admin'));

create policy "staff ve odontólogos" on public.doctores for select to authenticated using (public.es_staff());
create policy "admin crea odontólogos" on public.doctores for insert to authenticated with check (public.tiene_rol('admin'));
create policy "admin edita odontólogos" on public.doctores for update to authenticated using (public.tiene_rol('admin')) with check (public.tiene_rol('admin'));
create policy "admin borra odontólogos" on public.doctores for delete to authenticated using (public.tiene_rol('admin'));

create policy "cada quien ve su perfil" on public.perfiles for select to authenticated using (id = auth.uid() or public.es_staff());
create policy "admin edita perfiles" on public.perfiles for update to authenticated using (public.tiene_rol('admin')) with check (public.tiene_rol('admin'));
-- es_superadmin y correo no se pueden cambiar desde la app
revoke update on public.perfiles from authenticated;
grant update (nombre, rol, doctor_id, activo) on public.perfiles to authenticated;

create policy "admin gestiona invitaciones" on public.invitaciones for all to authenticated
  using (public.tiene_rol('admin')) with check (public.tiene_rol('admin'));

create policy "admin lee la auditoría" on public.auditoria for select to authenticated using (public.tiene_rol('admin'));
-- Sin políticas de escritura: solo los triggers (security definer) escriben aquí.

grant execute on function public.registrar_vista(text, text) to authenticated;
