# Udhar Plus — Security & Privacy Guidelines

Udhar Plus stores real financial relationships between shopkeepers and their customers. Treat every table
and every offline cache as sensitive financial data by default.

## 1. Authentication: Phone Number + OTP

There is **no 4-digit PIN gate**. Authentication is OTP-only (`app/login/page.tsx`) via two channels,
plus standard Logout (`components/auth/LogoutButton.tsx`). `proxy.ts` (Next 16's renamed `middleware.ts`)
refreshes the session cookie on every request and redirects unauthenticated requests to `/login`, but this
is an optimistic check only — real authorization still happens per-request via RLS (see §2) and
`lib/supabase/server.ts` reading the session close to the data. Route Handlers under `app/api/` are
excluded from proxy's redirect (they authorize themselves, per Next's own guidance) — any new route added
there must do its own auth check if it needs one; nothing does today except the bridge below, which is
deliberately unauthenticated since its whole job is to establish the first session.

### Email
Standard Supabase Auth OTP (`supabase.auth.signInWithOtp`/`verifyOtp`, `type: 'email'`). Whether Supabase
actually sends a 6-digit code vs. a magic link is controlled by the **email template configured in the
Supabase Auth dashboard**, not by client code — `emailRedirectTo: undefined` in the client call signals
OTP-only intent but doesn't enforce it on its own; confirm the dashboard template is set to send the code.

### Phone — Firebase bridge
Phone verification uses **Firebase Phone Auth** (`RecaptchaVerifier` + `signInWithPhoneNumber`,
`lib/firebase/client.ts`), not Supabase's own SMS provider. Because every table's `user_id` is a foreign
key to `auth.users(id)` and RLS is keyed on `auth.uid()`, the Firebase-verified identity must become a
**real Supabase Auth user**, not just a passed-through third-party JWT — Supabase's own "Third-Party Auth"
Firebase integration was considered and rejected for this reason (it never creates an `auth.users` row).

The bridge (`app/api/auth/firebase-phone/route.ts`):
1. Verifies the Firebase ID token server-side against Firebase's public JWKS via `jose` — no
   `firebase-admin` SDK / service-account JSON needed, deliberately avoiding that extra secret.
2. Checks `firebase.sign_in_provider === 'phone'` and reads the verified `phone_number` claim — the
   request body's own claims are never trusted for identity, only the token's verified payload.
3. Uses the `service_role` key (`lib/supabase/admin.ts`, `server-only`-guarded, never client-shipped —
   same rule as the anon key's counterpart below) to find-or-create that Supabase user and mint a session
   by setting a random one-time password server-side then calling `signInWithPassword` — the standard
   workaround for "create a session for user X" server-side, since no direct admin API for that exists.

**Known gap:** the existing-user lookup (`admin.auth.admin.listUsers`) has no phone filter, so it scans
one page of up to 1000 users. Revisit if the user base approaches that.

Logout must fully clear both Supabase's session (`supabase.auth.signOut()`) and the local IndexedDB
database (`wipeLocalDatabase()` in `lib/db/offlineStorage.ts`) so a shared/family device never retains a
previous user's ledger data — see §3.

**Known gap (tracked, not silently dropped):** the previous PIN-based design derived the offline
IndexedDB encryption key from the PIN (old §1/§3). With the PIN removed, offline data is currently
**stored unencrypted** in IndexedDB — acceptable short-term since it was never part of the Phase 1 scope,
but §3 below must be revisited before shipping cached financial data more broadly (e.g. a device-bound
key via Web Crypto `nonextractable` keys, or a lightweight app-level lock reintroduced purely for
key-derivation, not as an auth gate).

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

**Current status (Phase 1, `lib/db/offlineStorage.ts`): not yet implemented — see the Known gap in §1.**
The standard below is the target to implement once a key-derivation source is decided; ship it before
this cached data grows beyond the current schema (customers, bank accounts, transactions).

The app must remain usable offline, which means customer names, phone numbers, and balances are cached on
device outside of Supabase's protection. This data must be encrypted at rest.

- **Algorithm**: AES-GCM, 256-bit key, via the browser's native **Web Crypto API** (`crypto.subtle`) — no
  custom/hand-rolled crypto.
- **Key derivation**: source **TBD now that the PIN gate is removed** (§1) — candidates are a
  non-extractable Web Crypto key bound to the device, or a key derived from the Supabase session itself.
  Whatever is chosen, never store the key in plaintext in IndexedDB, `localStorage`, or `sessionStorage`.
- **Per-record nonce**: a fresh random 12-byte IV per encrypted record; never reuse an IV with the same key.
- **What is encrypted**: customer records, transaction/ledger entries, balances, any cached report data —
  i.e., all business data. Non-sensitive UI state (theme, last-visited route) may remain unencrypted.
- **What is never cached offline**: the user's Supabase auth credentials, or the service role key (which
  never reaches the client at all).
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
  once §3's encryption gap is closed, disclose the recovery implications of whatever key-derivation source
  is chosen (communicate this clearly in-product).
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
