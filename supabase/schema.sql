-- Skema Supabase (PostgreSQL) untuk aplikasi budgeting, dipetakan dari BUDGETING.xlsx
-- Jalankan sekali di Supabase → SQL Editor.

create type category_type as enum ('expense', 'income');
create type budget_group  as enum ('need', 'want', 'saving');        -- kolom "Jenis" N / W / S di DASHBOARD
create type tx_type       as enum ('expense', 'income', 'adjustment'); -- adjustment = "PENYESUAIAN SALDO" (boleh negatif)

create table accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users on delete cascade,
  name             text not null,
  sort_order       int  not null default 0,
  min_balance      numeric(14,2) not null default 0,   -- saldo yang ditahan (di Excel: Mandiri 25.000, BRI 50.000)
  include_in_total boolean not null default true,      -- di Excel: Brizzi & E-money tidak ikut "Total Saldo"
  is_active        boolean not null default true,
  unique (user_id, name)
);

create table categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null,
  type        category_type not null,
  grp         budget_group,                       -- hanya untuk expense
  icon        text,                               -- emoji; kosong = otomatis dari nama
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  unique (user_id, type, name)
);

create table transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  tx_date      date not null,
  type         tx_type not null,
  amount       numeric(14,2) not null,
  category_id  uuid references categories(id),
  account_id   uuid not null references accounts(id),
  note         text,
  created_at   timestamptz not null default now(),
  check (type = 'adjustment' or amount > 0),
  check (type = 'adjustment' or category_id is not null)
);
create index on transactions (user_id, tx_date);
create index on transactions (user_id, category_id, tx_date);
create index on transactions (user_id, account_id);

create table transfers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  tx_date         date not null,
  from_account_id uuid not null references accounts(id),
  to_account_id   uuid not null references accounts(id),
  amount          numeric(14,2) not null check (amount > 0),
  admin_fee       numeric(14,2) not null default 0,   -- negatif = bonus/cashback (ada 1 baris -750 di Excel)
  note            text,
  check (from_account_id <> to_account_id)
);
create index on transfers (user_id, tx_date);

create table budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  period_start  date not null,                    -- "Tgl Mulai" periode (sekarang tanggal 1)
  category_id   uuid not null references categories(id),
  amount        numeric(14,2) not null default 0,
  unique (user_id, period_start, category_id)
);

-- Saldo akun = pemasukan/penyesuaian - pengeluaran - mutasi keluar - biaya admin + mutasi masuk
-- (sama dengan rumus kolom "Saldo" di sheet DASHBOARD)
create view account_balances with (security_invoker = true) as
select a.id as account_id, a.name, a.sort_order, a.min_balance, a.include_in_total,
  coalesce((select sum(case when t.type = 'expense' then -t.amount else t.amount end)
            from transactions t where t.account_id = a.id), 0)
  + coalesce((select sum(amount) from transfers where to_account_id = a.id), 0)
  - coalesce((select sum(amount + admin_fee) from transfers where from_account_id = a.id), 0) as balance
from accounts a;

alter table accounts     enable row level security;
alter table categories   enable row level security;
alter table transactions enable row level security;
alter table transfers    enable row level security;
alter table budgets      enable row level security;

create policy own_rows on accounts     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on categories   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on transfers    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on budgets      for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Hak akses untuk pengguna yang sudah login (proyek Supabase baru tidak memberi ini otomatis).
-- Data tetap dibatasi per pengguna oleh policy RLS di atas. Pengguna anonim tidak diberi akses.
grant usage on schema public to authenticated;
grant select, insert, update, delete on accounts, categories, transactions, transfers, budgets to authenticated;
grant select on account_balances to authenticated;
