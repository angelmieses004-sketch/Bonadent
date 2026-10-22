-- =====================================================================
-- Bonadent · 0003 Clínico: panorámicas, marcadores, odontograma,
-- sugerencias de IA, almacenamiento privado y ajustes extra de la clínica.
-- Radiografías: SOLO admin y odontólogo. Recepción solo sabe si existen.
-- =====================================================================

alter table public.clinica
  add column ia_sugerencias boolean not null default false,
  add column color_marca text;

-- ---------------------------------------------------------------------
-- Panorámicas (la imagen vive en el bucket privado "panoramicas")
-- ---------------------------------------------------------------------
create table public.panoramicas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  storage_path text not null,
  tipo_mime text not null check (tipo_mime in ('image/jpeg', 'image/png', 'image/webp', 'image/svg+xml')),
  tomada_en date not null,
  doctor_id uuid references public.doctores (id) on delete set null,
  nota text,
  es_ejemplo boolean not null default false,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index panoramicas_paciente on public.panoramicas (paciente_id, tomada_en desc);

-- Marcadores sobre la imagen, enlazados a una pieza dental (x, y de 0 a 1)
create table public.marcadores (
  id uuid primary key default gen_random_uuid(),
  panoramica_id uuid not null references public.panoramicas (id) on delete cascade,
  x numeric(6,5) not null check (x between 0 and 1),
  y numeric(6,5) not null check (y between 0 and 1),
  pieza_fdi smallint not null check (pieza_fdi between 11 and 85),
  nota text,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Odontograma: estado actual por pieza + historial
-- ---------------------------------------------------------------------
create table public.odontograma_piezas (
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  pieza_fdi smallint not null check (pieza_fdi between 11 and 85),
  estado text not null check (estado in ('sana','caries','resina','endodoncia','corona','implante','ausente','extraccion')),
  situacion text check (situacion in ('indicado','realizado')),
  nota text,
  actualizado_por uuid default auth.uid(),
  actualizado_en timestamptz not null default now(),
  primary key (paciente_id, pieza_fdi)
);

create table public.odontograma_eventos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  pieza_fdi smallint not null,
  estado text not null,
  situacion text,
  nota text,
  doctor_id uuid references public.doctores (id) on delete set null,
  usuario_id uuid default auth.uid(),
  creado_en timestamptz not null default now()
);
create index odontograma_eventos_pieza on public.odontograma_eventos (paciente_id, pieza_fdi, creado_en desc);

-- Cada cambio de estado deja historial automáticamente
create function public.historial_pieza() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.odontograma_eventos (paciente_id, pieza_fdi, estado, situacion, nota, doctor_id)
  values (new.paciente_id, new.pieza_fdi, new.estado, new.situacion, new.nota,
          (select doctor_id from public.perfiles where id = auth.uid()));
  return new;
end $$;
create trigger historial_pieza after insert or update on public.odontograma_piezas
  for each row execute function public.historial_pieza();

-- ---------------------------------------------------------------------
-- Sugerencias de IA: nunca cambian el odontograma solas
-- ---------------------------------------------------------------------
create table public.sugerencias_ia (
  id uuid primary key default gen_random_uuid(),
  panoramica_id uuid not null references public.panoramicas (id) on delete cascade,
  x numeric(6,5) not null,
  y numeric(6,5) not null,
  radio numeric(6,5) not null default 0.05,
  pieza_fdi smallint,
  estado_sugerido text,
  descripcion text not null,
  confianza numeric(4,3),
  decision text not null default 'pendiente' check (decision in ('pendiente','aceptada','descartada')),
  decidido_por uuid,
  decidido_en timestamptz,
  creado_en timestamptz not null default now()
);

-- Recepción: saber si el paciente tiene panorámica, sin ver la imagen
create function public.paciente_tiene_panoramica(p_paciente uuid) returns integer
language sql stable security definer set search_path = public as $$
  select case when public.es_staff() then (select count(*)::int from public.panoramicas where paciente_id = p_paciente) else 0 end
$$;
grant execute on function public.paciente_tiene_panoramica(uuid) to authenticated;

-- Auditoría
create trigger auditar after insert or update or delete on public.panoramicas for each row execute function public.auditar();
create trigger auditar after insert or update or delete on public.marcadores for each row execute function public.auditar();
create trigger auditar after insert or update or delete on public.sugerencias_ia for each row execute function public.auditar();
create trigger tocar before update on public.panoramicas for each row execute function public.tocar_actualizado();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.panoramicas enable row level security;
alter table public.marcadores enable row level security;
alter table public.odontograma_piezas enable row level security;
alter table public.odontograma_eventos enable row level security;
alter table public.sugerencias_ia enable row level security;

create policy "clínicos gestionan panorámicas" on public.panoramicas for all to authenticated
  using (public.tiene_rol('admin', 'odontologo')) with check (public.tiene_rol('admin', 'odontologo'));
create policy "clínicos gestionan marcadores" on public.marcadores for all to authenticated
  using (public.tiene_rol('admin', 'odontologo')) with check (public.tiene_rol('admin', 'odontologo'));
create policy "clínicos gestionan sugerencias" on public.sugerencias_ia for all to authenticated
  using (public.tiene_rol('admin', 'odontologo')) with check (public.tiene_rol('admin', 'odontologo'));

create policy "staff ve el odontograma" on public.odontograma_piezas for select to authenticated using (public.es_staff());
create policy "clínicos editan el odontograma" on public.odontograma_piezas for insert to authenticated with check (public.tiene_rol('admin', 'odontologo'));
create policy "clínicos actualizan el odontograma" on public.odontograma_piezas for update to authenticated
  using (public.tiene_rol('admin', 'odontologo')) with check (public.tiene_rol('admin', 'odontologo'));
create policy "staff ve el historial" on public.odontograma_eventos for select to authenticated using (public.es_staff());

-- ---------------------------------------------------------------------
-- Storage privado
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('panoramicas', 'panoramicas', false, 26214400, array['image/jpeg','image/png','image/webp']),
  ('comprobantes', 'comprobantes', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('logos', 'logos', false, 2097152, array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

create policy "panorámicas: solo clínicos" on storage.objects for all to authenticated
  using (bucket_id = 'panoramicas' and public.tiene_rol('admin', 'odontologo'))
  with check (bucket_id = 'panoramicas' and public.tiene_rol('admin', 'odontologo'));
create policy "comprobantes: admin y recepción" on storage.objects for all to authenticated
  using (bucket_id = 'comprobantes' and public.tiene_rol('admin', 'recepcion'))
  with check (bucket_id = 'comprobantes' and public.tiene_rol('admin', 'recepcion'));
create policy "logos: staff lee" on storage.objects for select to authenticated using (bucket_id = 'logos' and public.es_staff());
create policy "logos: admin escribe" on storage.objects for insert to authenticated with check (bucket_id = 'logos' and public.tiene_rol('admin'));
create policy "logos: admin actualiza" on storage.objects for update to authenticated using (bucket_id = 'logos' and public.tiene_rol('admin'));
