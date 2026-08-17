# Udhar Plus — Security & Privacy Guidelines

Udhar Plus stores real financial relationships between shopkeepers and their customers. Treat every table
and every offline cache as sensitive financial data by default.

## 1. 4-Digit Security PIN Workflow

The PIN is an **app-level re-entry lock** layered on top of Supabase Auth — it is not a replacement for
proper authentication, and it is never sent to or verified against a server on every unlock (that would be
slow offline and create a brute-force oracle). Verification happens locally against a securely stored hash.

### Setup
1. After first successful Supabase Auth sign-in, prompt the user to create a 4-digit PIN (confirm twice).
2. Reject trivially weak PINs: `0000`, `1111`…`9999`, `1234`, `4321`, and any PIN matching the user's known
   birth year/phone digits if available.
3. Derive a key from the PIN using **PBKDF2 (≥ 210,000 iterations, SHA-256)** or **Argon2id** if a WASM
   implementation is available, with a random 16-byte salt stored alongside the (non-secret) salt value.
4. Store only the derived hash + salt locally (IndexedDB, see §3) — never the raw PIN, never in
   `localStorage` (unencrypted, XSS-readable), never logged, never sent to Supabase.

### Verification (app unlock)
1. On app foreground/launch, if a valid Supabase session exists, show the PIN entry screen instead of the
   login screen.
2. Hash the entered PIN with the stored salt and compare (constant-time comparison) to the stored hash.
3. **Lockout policy**: after **5 consecutive failed attempts**, lock PIN entry for **30 seconds**, doubling
   for each subsequent failed batch of 5 (capped at 30 minutes) — protects against brute force (only 10,000
   possible 4-digit PINs).
4. After **10 total failed attempts** in a lockout cycle, force full re-authentication via Supabase Auth
   (email/phone) before allowing another PIN attempt.
5. Successful PIN entry unlocks the local encryption key used for IndexedDB (see §3) — the PIN is not just
   a gate, it is part of the key-derivation chain for offline data.

### Session & re-lock
- Auto-lock (require PIN again) after **5 minutes** of app inactivity or whenever the app returns from
  background on mobile.
- "Forgot PIN" flow requires full Supabase re-authentication and issues a new PIN + new local encryption
  key — old encrypted offline data that can't be re-derived is discarded, never silently decrypted with a
  fallback key.
- Never allow disabling the PIN entirely while offline transactions/cached financial data are stored on
  device.

## 2. Supabase Row Level Security (RLS)

**RLS must be enabled on every table from the first migration.** Nothing ships with `RLS disabled` "to fix
later." Default posture: deny-all, then add explicit policies.

### Baseline pattern
```sql
alter table public.customers enable row level security;
alter table public.transactions enable row level security;

-- Every business table has an owner_id referencing the authenticated user.
create policy "owner can read own customers"
  on public.customers for select
  using (auth.uid() = owner_id);

create policy "owner can insert own customers"
  on public.customers for insert
  with check (auth.uid() = owner_id);

create policy "owner can update own customers"
  on public.customers for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "owner can delete own customers"
  on public.customers for delete
  using (auth.uid() = owner_id);
```

- Repeat the same four-policy pattern (`select`/`insert`/`update`/`delete`) per table — do not use a single
  `for all` policy, since it makes future auditing/removal of one operation harder.
- `transactions` (udhar entries) additionally check that the referenced `customer_id` belongs to the same
  `owner_id`, via a subquery or a denormalized `owner_id` column on `transactions` itself (preferred, avoids
  a join in the policy for performance):
  ```sql
  create policy "owner can insert own transactions"
    on public.transactions for insert
    with check (
      auth.uid() = owner_id
      and exists (
        select 1 from public.customers c
        where c.id = customer_id and c.owner_id = auth.uid()
      )
    );
  ```
- The **anon/publishable key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) is safe to ship client-side only because
  RLS is enforced — never use the `service_role` key in any client-shipped code, only in trusted server
  contexts (Vercel server actions/route handlers, never `NEXT_PUBLIC_`-prefixed).
- Add automated tests (or at minimum a manual checklist) that a second test user genuinely cannot read/
  write another user's rows before every release.
- Enable Supabase's built-in `pgaudit`/logging on the project for the `transactions` table given its
  financial sensitivity, once available on the plan tier in use.

## 3. Offline IndexedDB Encryption Standard

The app must remain usable offline, which means customer names, phone numbers, and balances are cached on
device outside of Supabase's protection. This data must be encrypted at rest.

- **Algorithm**: AES-GCM, 256-bit key, via the browser's native **Web Crypto API** (`crypto.subtle`) — no
  custom/hand-rolled crypto.
- **Key derivation**: the AES key is derived from the user's PIN (§1) using PBKDF2/Argon2id, never stored
  in plaintext in IndexedDB, `localStorage`, or `sessionStorage`. The key exists only in memory after a
  successful unlock and is discarded on lock/backgrounding.
- **Per-record nonce**: a fresh random 12-byte IV per encrypted record; never reuse an IV with the same key.
- **What is encrypted**: customer records, transaction/ledger entries, balances, any cached report data —
  i.e., all business data. Non-sensitive UI state (theme, last-visited route) may remain unencrypted.
- **What is never cached offline**: the user's Supabase auth password, the raw PIN, or the service role
  key (which never reaches the client at all).
- **Sync queue**: pending offline writes are stored encrypted with the same scheme; on reconnect, decrypt
  in memory, push to Supabase over TLS, then clear the local queue entry only after server confirmation.
- **Wipe on logout**: full Supabase sign-out clears the IndexedDB database entirely (not just the in-memory
  key) — a shared/family device must not retain a previous user's ledger data.

## 4. Privacy & Compliance Guidelines

- **Data minimization**: collect only what the ledger needs (customer name, phone, optional photo/note,
  transaction amounts/dates). No unnecessary personal data (CNIC/ID numbers, addresses) unless the user
  explicitly adds it as a note — and even then, treat notes as sensitive freeform data.
- **No third-party trackers/analytics SDKs** that read financial or contact data. If product analytics are
  added later, use event-level (not PII-attached) tracking and document it here before shipping.
- **Consent & transparency**: on first launch, disclose what is stored locally vs. synced to Supabase, and
  that offline data is encrypted using a key derived from the user's PIN (so losing the PIN and Supabase
  access together means offline-only data cannot be recovered — communicate this clearly in-product).
- **Data subject rights**: support in-app "export my data" (CSV/JSON of customers + transactions) and
  "delete my account" (cascades to all owned rows via RLS-respecting server action, plus local IndexedDB
  wipe) — build these before public launch, not as an afterthought.
- **Regional context**: this app targets South Asian shopkeepers tracking informal credit (udhar). It is
  not a licensed lending or credit-reporting product — do not add features that calculate interest, credit
  scores, or anything resembling a regulated financial product without separate legal review. Stay a
  record-keeping tool, not a lender.
- **Least-privilege secrets**: `.env.local` (with real keys) is git-ignored; only `.env.local.example`
  (placeholder values) is committed. Rotate the Supabase anon key if it is ever accidentally committed or
  leaked, and audit `service_role` key usage on every PR touching server code.
- **Dependency hygiene**: run `npm audit`/Dependabot regularly given this app handles financial data; patch
  high/critical vulnerabilities promptly rather than deferring to a later phase.
