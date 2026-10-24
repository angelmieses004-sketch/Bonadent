-- =====================================================================
-- Bonadent · 0004 Inventario: artículos de la clínica y sus movimientos
-- Todo el equipo puede sacar o poner existencias; admin y recepción
-- crean, editan y borran artículos.
-- =====================================================================

create table public.inventario_articulos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  categoria text not null default 'Otros',
  unidad text not null default 'unidades',
  cantidad numeric(12,2) not null default 0 check (cantidad >= 0),
  minimo numeric(12,2) not null default 0 check (minimo >= 0),
  nota text,
  activo boolean not null default true,
  es_ejemplo boolean not null default false,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index inventario_articulos_categoria on public.inventario_articulos (categoria, nombre);

create table public.inventario_movimientos (
  id uuid primary key default gen_random_uuid(),
  articulo_id uuid not null references public.inventario_articulos (id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'salida', 'ajuste')),
  cantidad numeric(12,2) not null,           -- con signo: +entra, −sale
  resultante numeric(12,2) not null,         -- existencia después del movimiento
  motivo text,
  usuario_id uuid default auth.uid(),
  creado_en timestamptz not null default now()
);
create index inventario_movimientos_articulo on public.inventario_movimientos (articulo_id, creado_en desc);
create index inventario_movimientos_fecha on public.inventario_movimientos (creado_en desc);

-- Movimiento atómico: suma/resta sin quedar en negativo y deja historial.
create function public.mover_inventario(p_articulo uuid, p_delta numeric, p_motivo text default null, p_exacto numeric default null)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  actual numeric;
  nueva numeric;
begin
  if not public.es_staff() then raise exception 'sin permiso' using errcode = '42501'; end if;
  select cantidad into actual from public.inventario_articulos where id = p_articulo and activo for update;
  if not found then raise exception 'artículo no encontrado'; end if;
  nueva := coalesce(p_exacto, actual + p_delta);
  if nueva < 0 then raise exception 'No hay suficientes existencias' using errcode = '23514'; end if;
  update public.inventario_articulos set cantidad = nueva, actualizado_en = now() where id = p_articulo;
  insert into public.inventario_movimientos (articulo_id, tipo, cantidad, resultante, motivo)
  values (p_articulo, case when p_exacto is not null then 'ajuste' when nueva >= actual then 'entrada' else 'salida' end, nueva - actual, nueva, p_motivo);
  return nueva;
end $$;
grant execute on function public.mover_inventario(uuid, numeric, text, numeric) to authenticated;

create trigger auditar after insert or update or delete on public.inventario_articulos for each row execute function public.auditar();
create trigger tocar before update on public.inventario_articulos for each row execute function public.tocar_actualizado();

alter table public.inventario_articulos enable row level security;
alter table public.inventario_movimientos enable row level security;

create policy "staff ve el inventario" on public.inventario_articulos for select to authenticated using (public.es_staff());
create policy "admin y recepción crean artículos" on public.inventario_articulos for insert to authenticated with check (public.tiene_rol('admin', 'recepcion'));
create policy "admin y recepción editan artículos" on public.inventario_articulos for update to authenticated
  using (public.tiene_rol('admin', 'recepcion')) with check (public.tiene_rol('admin', 'recepcion'));
create policy "admin y recepción borran artículos" on public.inventario_articulos for delete to authenticated using (public.tiene_rol('admin', 'recepcion'));
-- Los movimientos solo se escriben con mover_inventario() (security definer)
create policy "staff ve los movimientos" on public.inventario_movimientos for select to authenticated using (public.es_staff());
