-- ============================================================
-- made2meant — Widerruf (gesetzlicher Widerrufsbutton)
-- Im Supabase SQL-Editor einmalig ausführen.
-- Eingänge kommen über die Edge Function notify-withdrawal (Service Role),
-- die RLS umgeht. Lesen dürfen nur Admins.
-- ============================================================
create table if not exists withdrawals (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  order_ref     text not null,
  first_name    text,
  last_name     text,
  email         text,
  order_date    date,
  received_date date,
  note          text,
  status        text not null default 'neu'
);

alter table withdrawals enable row level security;

-- Nur Admins dürfen Widerrufe sehen (Insert läuft über die Edge Function).
drop policy if exists withdrawals_admin_select on withdrawals;
create policy withdrawals_admin_select on withdrawals
  for select using (is_admin());

drop policy if exists withdrawals_admin_update on withdrawals;
create policy withdrawals_admin_update on withdrawals
  for update using (is_admin());
