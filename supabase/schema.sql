-- Udhar Plus — Phase 1 schema
-- Run in the Supabase SQL Editor (or via `supabase db push`) against the project
-- at https://iysyohxxjzwruuimtobt.supabase.co
--
-- Tables:
--   customers      Module A — Shopkeeper / Retailer Khata
--   bank_accounts  Module B — Bank & Wallet Cash Flow Manager
--   transactions   Shared ledger for both modules, discriminated by entity_type
--
-- RLS: deny-all by default, explicit per-operation policies scoped to auth.uid() = user_id,
-- per the baseline pattern in SECURITY.md.

create extension if not exists "pgcrypto";

-- Shared trigger: keep updated_at current on every row update.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- customers (Module A: Retailer Khata)
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  current_balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_user_id_idx on public.customers (user_id);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;

create policy "owner can read own customers"
  on public.customers for select
  using (auth.uid() = user_id);

create policy "owner can insert own customers"
  on public.customers for insert
  with check (auth.uid() = user_id);

create policy "owner can update own customers"
  on public.customers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner can delete own customers"
  on public.customers for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- bank_accounts (Module B: Bank & Wallet Cash Flow Manager)
-- ---------------------------------------------------------------------------
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bank_name text not null,
  bank_code text not null,
  account_title text not null,
  account_number text not null,
  current_balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bank_accounts_user_id_idx on public.bank_accounts (user_id);

create trigger bank_accounts_set_updated_at
  before update on public.bank_accounts
  for each row execute function public.set_updated_at();

alter table public.bank_accounts enable row level security;

create policy "owner can read own bank accounts"
  on public.bank_accounts for select
  using (auth.uid() = user_id);

create policy "owner can insert own bank accounts"
  on public.bank_accounts for insert
  with check (auth.uid() = user_id);

create policy "owner can update own bank accounts"
  on public.bank_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner can delete own bank accounts"
  on public.bank_accounts for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- transactions (shared ledger: customer udhar entries + bank/wallet cash flow)
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('customer', 'bank')),
  entity_id uuid not null,
  type text not null check (type in ('IN', 'OUT')),
  amount numeric(14, 2) not null check (amount > 0),
  note text,
  transaction_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  synced boolean not null default true
);

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_entity_idx on public.transactions (entity_type, entity_id);

alter table public.transactions enable row level security;

create policy "owner can read own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "owner can insert own transactions"
  on public.transactions for insert
  with check (
    auth.uid() = user_id
    and (
      (entity_type = 'customer' and exists (
        select 1 from public.customers c
        where c.id = entity_id and c.user_id = auth.uid()
      ))
      or
      (entity_type = 'bank' and exists (
        select 1 from public.bank_accounts b
        where b.id = entity_id and b.user_id = auth.uid()
      ))
    )
  );

create policy "owner can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);
