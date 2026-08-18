# Udhar Plus — Project Plan

## 1. Vision

Udhar Plus is a commercial-grade, senior-friendly Progressive Web App (PWA) that lets shopkeepers and small
lenders track **udhar** (credit/loans given to customers) without a paper ledger. The product must remain
usable by elderly and low-literacy users: large text, high-contrast colors, minimal steps per action, and
graceful behavior on poor or no internet connection.

Primary user: a shopkeeper (30–65+ years old) who wants to record what a customer owes, mark payments
received, and see a running balance — reliably, even offline.

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Server components by default, route handlers for API |
| Language | TypeScript | Strict mode on |
| Styling | Tailwind CSS (v3, `tailwind.config.ts`) | See `FRONTEND_UI.md` for tokens |
| Backend / DB | Supabase (Postgres + Auth + Storage) | RLS-enforced, see `SECURITY.md` |
| Auth | Supabase Auth — Phone Number + OTP only | No PIN gate; session + Logout are the only auth surfaces |
| Offline storage | IndexedDB via `Dexie.js` | Dual-storage: instant local read/write, background auto-sync to Supabase |
| PWA | Web App Manifest + Service Worker (`next-pwa` or hand-rolled) | Installable, offline-capable shell |
| Hosting | Vercel (recommended) | Supabase project already provisioned |
| State/data fetching | Server Components + Supabase JS client, React Query for client-side caching where needed | |

## 3. Repository & Environment

- GitHub: `https://github.com/raffyabdul890-blip/Udhar-Plus.git`
- Supabase project: `https://iysyohxxjzwruuimtobt.supabase.co`
- Env vars live in `.env.local` (git-ignored); `.env.local.example` is committed as a template.

## 4. Phase Breakdown

### Phase 0 — Boilerplate & Foundations (current)
- Next.js 14+ App Router + TypeScript + Tailwind scaffold
- Brand theme tokens in `tailwind.config.ts`
- Project documentation (`PLAN.md`, `FRONTEND_UI.md`, `SECURITY.md`)
- Base layout, global styles, PWA metadata shell
- Skeleton loading components (`CustomerCardSkeleton`, `BalanceCardSkeleton`)

### Phase 1 — Database Schema, OTP Auth & Offline Engine (complete)
- `customers`, `bank_accounts`, `transactions` tables + RLS policies (`supabase/schema.sql`)
- Phone Number + OTP login (`app/login/page.tsx`) and Logout — no PIN gate
- Local IndexedDB manager via Dexie (`lib/db/offlineStorage.ts`) for sub-10ms reads/writes
- Background sync engine (`lib/sync/syncEngine.ts`): pushes pending offline writes to Supabase on
  reconnect, and rehydrates local IndexedDB from Supabase on fresh login

### Phase 2 — Core Ledger (Customers & Udhar Entries)
- Customer CRUD (name, phone, photo optional, notes)
- Udhar entries: give credit / record payment, running balance per customer
- Transaction history per customer
- Dashboard: total outstanding, total collected, top debtors

### Phase 3 — Offline-First Sync
- IndexedDB local cache of customers + transactions (encrypted)
- Optimistic writes while offline, background sync to Supabase on reconnect
- Conflict resolution strategy (last-write-wins with audit trail)

### Phase 4 — Reminders & Notifications
- Manual "send reminder" (SMS/WhatsApp deep link or share sheet)
- Optional push notifications (Web Push) for due dates
- Configurable reminder templates

### Phase 5 — Reports & Insights
- Monthly/weekly summaries
- Export ledger (CSV/PDF)
- Simple charts (outstanding trend, collection rate)

### Phase 6 — PWA Polish & Installability
- App icons, splash screens, manifest finalization
- Install prompt UX for Android/iOS
- Offline fallback page, background sync indicators

### Phase 7 — Hardening, Testing & Launch
- Accessibility audit (large text, screen reader labels, tap target sizes)
- Security review (RLS coverage, PIN brute-force protection, encryption at rest)
- Performance pass (Lighthouse PWA score), beta rollout

## 5. Core Features (MVP scope: Phases 0–3)

- Phone Number + OTP login via Supabase Auth (no PIN gate)
- Top Search Bar: instant search across customer names, bank titles, account numbers, amounts, notes
- Module A (Retailer Khata): add/edit/delete customer, "Diye"/"Milay" transaction entries, running balance
- Module B (Bank & Wallet Cash Flow Manager): Pakistani commercial banks + digital wallets (Meezan, HBL,
  UBL, MCB, Allied, BOP, Easypaisa, JazzCash, SadaPay, NayaPay, …), Cash IN/OUT tracking per account
- Per-entity running balance, full transaction history
- Dashboard totals (outstanding, collected this month)
- Works offline: view cached data, queue new entries, auto-sync when back online
- Installable as a home-screen PWA

## 6. Primary User Flows

1. **Onboarding**: Enter phone number → enter OTP → local IndexedDB hydrates from Supabase → dashboard.
2. **Re-entry**: Open app → valid Supabase session → straight to dashboard (offline data already local).
3. **Add customer**: Dashboard → "+ New Customer" → name/phone → save → customer card appears.
4. **Record udhar given**: Customer profile → "Give Udhar" → amount + optional note → save → balance updates.
5. **Record payment received**: Customer profile → "Received Payment" → amount → save → balance decreases.
6. **Offline entry**: No connection → banner shown → entries saved locally → sync badge shows pending count →
   auto-syncs on reconnect.
7. **Reminder**: Customer profile → "Remind" → share balance via SMS/WhatsApp link.
8. **View reports**: Dashboard → "Reports" → filter by date range → export.

## 7. Folder Structure Convention

```
app/
  login/             Phone Number + OTP login page
  api/               route handlers (webhooks, server actions helpers)
  layout.tsx
  globals.css
proxy.ts             session refresh + route protection (Next 16 renamed middleware)
components/
  ui/                generic primitives (Button, Card, Input)
  skeletons/          loading-state components
  auth/               LogoutButton and other auth UI
  sync/               SyncManagerMount (background sync bootstrap)
  customers/          customer-specific components
lib/
  supabase/           browser + server Supabase clients
  db/                 offlineStorage.ts — Dexie/IndexedDB CRUD
  sync/               syncEngine.ts — background auto-sync + cloud rehydration
types/                shared TypeScript types
supabase/
  schema.sql          tables + RLS policies
```

## 8. Deployment Notes

- Vercel project connected to the `main` branch of the GitHub repo.
- Supabase env vars set both in `.env.local` (local dev) and Vercel project settings (production/preview).
- Database migrations tracked via Supabase CLI/migrations folder once backend work begins (Phase 1+).
