-- GOMIXX: instalación inicial para Supabase
-- Ejecutá TODO este archivo en Supabase > SQL Editor.
-- Después seguí los pasos del archivo LEEME para registrar al administrador.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_codes (
  id bigint generated always as identity primary key,
  code text not null unique,
  order_reference text,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create table if not exists public.prizes (
  id bigint generated always as identity primary key,
  name text not null,
  description text not null default '',
  weight integer not null default 1 check (weight > 0),
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.spins (
  id bigint generated always as identity primary key,
  purchase_code_id bigint not null unique references public.purchase_codes(id),
  prize_id bigint not null references public.prizes(id),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.purchase_codes enable row level security;
alter table public.prizes enable row level security;
alter table public.spins enable row level security;

-- Sin acceso directo a tablas desde el navegador: todo pasa por funciones controladas.
revoke all on public.admin_users from anon, authenticated;
revoke all on public.purchase_codes from anon, authenticated;
revoke all on public.prizes from anon, authenticated;
revoke all on public.spins from anon, authenticated;
revoke all on sequence public.purchase_codes_id_seq from anon, authenticated;
revoke all on sequence public.prizes_id_seq from anon, authenticated;
revoke all on sequence public.spins_id_seq from anon, authenticated;

insert into public.prizes(name, description, weight, active, sort_order)
select v.name, v.description, v.weight, true, v.sort_order
from (values
  ('+5 g de gomitas', 'Sumamos 5 g extra a tu próxima compra. Canje válido por 30 días.', 1, 1),
  ('+5 g de gomitas', 'Sumamos 5 g extra a tu próxima compra. Canje válido por 30 días.', 1, 2),
  ('+10 g de gomitas', 'Sumamos 10 g extra a tu próxima compra. Canje válido por 30 días.', 1, 3),
  ('5% de descuento', '5% de descuento en tu próxima compra, con el tope que indique Gomixx. Válido por 30 días.', 1, 4),
  ('10% de descuento', '10% de descuento en tu próxima compra, con el tope que indique Gomixx. Válido por 30 días.', 1, 5),
  ('Variedad sorpresa +5 g', 'Elegí una variedad sorpresa: sumamos 5 g a tu próxima compra. Válido por 30 días.', 1, 6),
  ('Mini sorpresa +5 g', 'Un extra sorpresa de 5 g en tu próxima compra. Válido por 30 días.', 1, 7),
  ('Sello extra', 'Recibís un sello extra en tu tarjeta de fidelidad en tu próxima compra. Válido por 30 días.', 1, 8)
) as v(name, description, weight, sort_order)
where not exists (select 1 from public.prizes);

create or replace function public.is_gomixx_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.issue_purchase_code(p_order_reference text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null or not public.is_gomixx_admin() then
    raise exception 'admin_only';
  end if;
  v_code := 'GOMI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.purchase_codes(code, order_reference)
  values (v_code, nullif(trim(p_order_reference), ''));
  return v_code;
end;
$$;

create or replace function public.spin_with_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchase_codes%rowtype;
  v_total numeric;
  v_pick numeric;
  v_running numeric := 0;
  v_prize public.prizes%rowtype;
begin
  if p_code is null or length(trim(p_code)) < 6 then
    raise exception 'invalid_code';
  end if;

  -- Bloquea el código durante el giro para impedir dos usos simultáneos.
  select * into v_purchase
  from public.purchase_codes
  where code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'invalid_code';
  end if;
  if v_purchase.used_at is not null then
    raise exception 'code_already_used';
  end if;

  select sum(weight) into v_total from public.prizes where active = true;
  if v_total is null or v_total <= 0 then
    raise exception 'no_active_prizes';
  end if;

  v_pick := random() * v_total;
  select * into v_prize
  from (
    select p.*, sum(p.weight) over (order by p.sort_order, p.id) as cumulative_weight
    from public.prizes p
    where p.active = true
  ) choices
  where cumulative_weight > v_pick
  order by cumulative_weight
  limit 1;

  if v_prize.id is null then
    raise exception 'prize_selection_failed';
  end if;

  update public.purchase_codes set used_at = now() where id = v_purchase.id;
  insert into public.spins(purchase_code_id, prize_id) values (v_purchase.id, v_prize.id);

  return jsonb_build_object(
    'prize_name', v_prize.name,
    'prize_description', v_prize.description
  );
end;
$$;

create or replace function public.admin_list_spins()
returns table (
  spin_created_at timestamptz,
  code text,
  order_reference text,
  prize_name text,
  prize_description text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_gomixx_admin() then
    raise exception 'admin_only';
  end if;

  return query
  select s.created_at, pc.code, pc.order_reference, p.name, p.description
  from public.spins s
  join public.purchase_codes pc on pc.id = s.purchase_code_id
  join public.prizes p on p.id = s.prize_id
  order by s.created_at desc
  limit 500;
end;
$$;

revoke all on function public.is_gomixx_admin() from public, anon, authenticated;
revoke all on function public.issue_purchase_code(text) from public, anon, authenticated;
revoke all on function public.spin_with_code(text) from public, authenticated;
revoke all on function public.admin_list_spins() from public, anon, authenticated;

grant execute on function public.issue_purchase_code(text) to authenticated;
grant execute on function public.spin_with_code(text) to anon, authenticated;
grant execute on function public.admin_list_spins() to authenticated;
