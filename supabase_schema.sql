-- Udhar Plus — consolidated, safe-to-rerun schema/migration script.
--
-- This is the single source of truth for the database schema. Every
-- statement here is idempotent: CREATE TABLE IF NOT EXISTS, ADD COLUMN IF
-- NOT EXISTS, and DROP POLICY IF EXISTS + CREATE POLICY. Run this in the
-- Supabase SQL Editor any time — whether the base tables already exist or
-- not, it converges the database to the same state.
--
-- RLS convention throughout: deny-all by default, explicit per-operation
-- policies scoped to auth.uid() = user_id (see SECURITY.md §2).

create extension if not exists "pgcrypto";

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
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  current_balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customers add column if not exists phone text;

create index if not exists customers_user_id_idx on public.customers (user_id);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;

drop policy if exists "owner can read own customers" on public.customers;
create policy "owner can read own customers"
  on public.customers for select
  using (auth.uid() = user_id);

drop policy if exists "owner can insert own customers" on public.customers;
create policy "owner can insert own customers"
  on public.customers for insert
  with check (auth.uid() = user_id);

drop policy if exists "owner can update own customers" on public.customers;
create policy "owner can update own customers"
  on public.customers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner can delete own customers" on public.customers;
create policy "owner can delete own customers"
  on public.customers for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- bank_accounts (Module B: Bank & Wallet Cash Flow Manager)
-- ---------------------------------------------------------------------------
create table if not exists public.bank_accounts (
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

create index if not exists bank_accounts_user_id_idx on public.bank_accounts (user_id);

drop trigger if exists bank_accounts_set_updated_at on public.bank_accounts;
create trigger bank_accounts_set_updated_at
  before update on public.bank_accounts
  for each row execute function public.set_updated_at();

alter table public.bank_accounts enable row level security;

drop policy if exists "owner can read own bank accounts" on public.bank_accounts;
create policy "owner can read own bank accounts"
  on public.bank_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "owner can insert own bank accounts" on public.bank_accounts;
create policy "owner can insert own bank accounts"
  on public.bank_accounts for insert
  with check (auth.uid() = user_id);

drop policy if exists "owner can update own bank accounts" on public.bank_accounts;
create policy "owner can update own bank accounts"
  on public.bank_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner can delete own bank accounts" on public.bank_accounts;
create policy "owner can delete own bank accounts"
  on public.bank_accounts for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- transactions (shared ledger: customer udhar entries + bank/wallet cash flow)
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
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
-- Itemized sale breakdown: [{ id, name, quantity, unit, pricePerUnit }].
-- Photo attachments are local-only (IndexedDB) and never synced here.
alter table public.transactions add column if not exists items jsonb;

-- Phase 5: Bank & Wallet linking. payment_method/payment_account_id route a
-- customer Milay payment into Cashbook (cash) or an account (bank/wallet).
-- linked_transaction_id/linked_cashbook_entry_id are plain uuid pointers (no
-- FK) — the linked row can belong to either table, and app code (lib/db/
-- ledger.ts) already owns reversing them together on edit/delete, matching
-- the existing polymorphic entity_id convention (also no FK) on this table.
alter table public.transactions add column if not exists payment_method text
  check (payment_method in ('cash', 'bank', 'wallet'));
alter table public.transactions add column if not exists payment_account_id uuid;
alter table public.transactions add column if not exists link_kind text
  check (link_kind in ('payment_owner', 'customer_payment_leg', 'expense_leg', 'transfer_leg'));
alter table public.transactions add column if not exists linked_transaction_id uuid;
alter table public.transactions add column if not exists linked_cashbook_entry_id uuid;

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_entity_idx on public.transactions (entity_type, entity_id);

alter table public.transactions enable row level security;

drop policy if exists "owner can read own transactions" on public.transactions;
create policy "owner can read own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

drop policy if exists "owner can insert own transactions" on public.transactions;
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

drop policy if exists "owner can update own transactions" on public.transactions;
create policy "owner can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner can delete own transactions" on public.transactions;
create policy "owner can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- items (Items / Inventory tab)
-- ---------------------------------------------------------------------------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  stock_quantity numeric(14, 2) not null default 0,
  purchase_price numeric(14, 2),
  selling_price numeric(14, 2),
  low_stock_threshold numeric(14, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_user_id_idx on public.items (user_id);

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

alter table public.items enable row level security;

drop policy if exists "owner can read own items" on public.items;
create policy "owner can read own items"
  on public.items for select
  using (auth.uid() = user_id);

drop policy if exists "owner can insert own items" on public.items;
create policy "owner can insert own items"
  on public.items for insert
  with check (auth.uid() = user_id);

drop policy if exists "owner can update own items" on public.items;
create policy "owner can update own items"
  on public.items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner can delete own items" on public.items;
create policy "owner can delete own items"
  on public.items for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- cashbook_entries (Cashbook tab — general daily cash IN/OUT, not tied to a
-- specific customer or bank account)
-- ---------------------------------------------------------------------------
create table if not exists public.cashbook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('IN', 'OUT')),
  amount numeric(14, 2) not null check (amount > 0),
  category text not null,
  note text,
  entry_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Phase 4: Expenses is a lens over cashbook_entries (type='OUT' + is_expense),
-- not a separate table — one source of truth, no duplicate-entry risk.
-- payment_method distinguishes real cash movements (which affect the
-- Cashbook's cash balance) from bank/wallet expenses (which don't).
alter table public.cashbook_entries add column if not exists is_expense boolean not null default false;
alter table public.cashbook_entries add column if not exists payment_method text not null default 'cash'
  check (payment_method in ('cash', 'bank', 'wallet'));

-- Phase 5: Bank & Wallet linking — same rationale as transactions above.
alter table public.cashbook_entries add column if not exists account_id uuid;
alter table public.cashbook_entries add column if not exists link_kind text
  check (link_kind in ('expense_owner', 'payment_leg'));
alter table public.cashbook_entries add column if not exists linked_transaction_id uuid;

create index if not exists cashbook_entries_user_id_idx on public.cashbook_entries (user_id);
create index if not exists cashbook_entries_date_idx on public.cashbook_entries (entry_date);

alter table public.cashbook_entries enable row level security;

drop policy if exists "owner can read own cashbook entries" on public.cashbook_entries;
create policy "owner can read own cashbook entries"
  on public.cashbook_entries for select
  using (auth.uid() = user_id);

drop policy if exists "owner can insert own cashbook entries" on public.cashbook_entries;
create policy "owner can insert own cashbook entries"
  on public.cashbook_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "owner can update own cashbook entries" on public.cashbook_entries;
create policy "owner can update own cashbook entries"
  on public.cashbook_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner can delete own cashbook entries" on public.cashbook_entries;
create policy "owner can delete own cashbook entries"
  on public.cashbook_entries for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- business_settings (one row per user — More tab profile, shown on the
-- Customers header too). user_id is the primary key by design: it's a
-- singleton per account, and this lets Supabase upserts key off it directly.
-- ---------------------------------------------------------------------------
create table if not exists public.business_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  business_name text,
  phone text,
  address text,
  category text,
  language text not null default 'en' check (language in ('en', 'ur')),
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_settings add column if not exists theme text not null default 'light'
  check (theme in ('light', 'dark', 'system'));

drop trigger if exists business_settings_set_updated_at on public.business_settings;
create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

alter table public.business_settings enable row level security;

drop policy if exists "owner can read own business settings" on public.business_settings;
create policy "owner can read own business settings"
  on public.business_settings for select
  using (auth.uid() = user_id);

drop policy if exists "owner can insert own business settings" on public.business_settings;
create policy "owner can insert own business settings"
  on public.business_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "owner can update own business settings" on public.business_settings;
create policy "owner can update own business settings"
  on public.business_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner can delete own business settings" on public.business_settings;
create policy "owner can delete own business settings"
  on public.business_settings for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Staff / Salary Book Lite — schema only. No app UI reads/writes these yet
-- (planned for a follow-up round); included now per the requested migration
-- file so the tables exist ahead of that work.
-- ---------------------------------------------------------------------------
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  monthly_salary numeric(14, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_members_user_id_idx on public.staff_members (user_id);

drop trigger if exists staff_members_set_updated_at on public.staff_members;
create trigger staff_members_set_updated_at
  before update on public.staff_members
  for each row execute function public.set_updated_at();

alter table public.staff_members enable row level security;

drop policy if exists "owner can read own staff members" on public.staff_members;
create policy "owner can read own staff members"
  on public.staff_members for select
  using (auth.uid() = user_id);

drop policy if exists "owner can insert own staff members" on public.staff_members;
create policy "owner can insert own staff members"
  on public.staff_members for insert
  with check (auth.uid() = user_id);

drop policy if exists "owner can update own staff members" on public.staff_members;
create policy "owner can update own staff members"
  on public.staff_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner can delete own staff members" on public.staff_members;
create policy "owner can delete own staff members"
  on public.staff_members for delete
  using (auth.uid() = user_id);

create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  staff_id uuid not null references public.staff_members (id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'leave')),
  created_at timestamptz not null default now(),
  unique (staff_id, attendance_date)
);

create index if not exists staff_attendance_user_id_idx on public.staff_attendance (user_id);

alter table public.staff_attendance enable row level security;

drop policy if exists "owner can read own staff attendance" on public.staff_attendance;
create policy "owner can read own staff attendance"
  on public.staff_attendance for select
  using (auth.uid() = user_id);

drop policy if exists "owner can insert own staff attendance" on public.staff_attendance;
create policy "owner can insert own staff attendance"
  on public.staff_attendance for insert
  with check (auth.uid() = user_id);

drop policy if exists "owner can update own staff attendance" on public.staff_attendance;
create policy "owner can update own staff attendance"
  on public.staff_attendance for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner can delete own staff attendance" on public.staff_attendance;
create policy "owner can delete own staff attendance"
  on public.staff_attendance for delete
  using (auth.uid() = user_id);

create table if not exists public.staff_advances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  staff_id uuid not null references public.staff_members (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  note text,
  advance_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists staff_advances_user_id_idx on public.staff_advances (user_id);

alter table public.staff_advances enable row level security;

drop policy if exists "owner can read own staff advances" on public.staff_advances;
create policy "owner can read own staff advances"
  on public.staff_advances for select
  using (auth.uid() = user_id);

drop policy if exists "owner can insert own staff advances" on public.staff_advances;
create policy "owner can insert own staff advances"
  on public.staff_advances for insert
  with check (auth.uid() = user_id);

drop policy if exists "owner can update own staff advances" on public.staff_advances;
create policy "owner can update own staff advances"
  on public.staff_advances for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner can delete own staff advances" on public.staff_advances;
create policy "owner can delete own staff advances"
  on public.staff_advances for delete
  using (auth.uid() = user_id);
