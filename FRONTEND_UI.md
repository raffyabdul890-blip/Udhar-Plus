# Udhar Plus — Frontend UI Guidelines

Audience note: primary users skew older and may have reduced vision, dexterity, or smartphone
familiarity. Every rule below exists to reduce misreads and mis-taps. When in doubt, choose the larger,
higher-contrast, more forgiving option.

Visual direction: **Ocean Wave** — white/very-light-blue surfaces, clean, modern, professional, a
Pakistani shopkeeper/business app rather than a consumer-flashy or dark "fintech" theme. Ocean blue is the
brand/navigation color; green, red/orange, and a secondary purple-blue accent are reserved for financial
meaning (Receivable, Payable, Cash, Bank & Wallet, etc.), used carefully rather than saturating the whole UI.

## 1. Color System

| Token | Hex | Role |
|---|---|---|
| `canvas` | `#F5FAFE` | App background — white with a whisper of blue |
| `surface` | `#FFFFFF` | Card / modal background |
| `surface-alt` | `#EAF2F9` | Secondary surface, hover/pressed backgrounds, stat-card fills |
| `surface-dim` | `#E3EDF5` | Skeleton/shimmer base |
| `border` | `#DCE7F0` | Default hairline border |
| `border-strong` | `#C2D5E3` | Stronger border, rarely needed |
| `ink` | `#111827` | Primary text |
| `ink-secondary` | `#64748B` | Secondary text |
| `ink-tertiary` | `#93A5B8` | Placeholder / disabled / least-important text |
| `primary` / `primary-dark` / `primary-light` | `#0369A1` / `#075985` / `#E0F2FE` | Brand ocean blue — navigation, links, secondary actions, Cash/Sale tints |
| `accent` / `accent-dark` / `accent-light` | `#4F46E5` / `#4338CA` / `#E0E7FF` | Secondary purple-blue accent — Bank & Wallet, Add Customer tints |
| `success` / `success-dark` / `success-light` | `#16A34A` / `#15803D` / `#DCFCE7` | Positive financial actions: Receive Payment, Cash In, Payable |
| `danger` / `danger-dark` / `danger-light` | `#DC2626` / `#B91C1C` / `#FEE2E2` | **Destructive actions only** (delete customer/item/entry), also Give Udhaar/Receivable tints — soft-tinted, not a heavy fill |
| `warning` / `warning-light` | `#D97706` / `#FEF3C7` | Legitimate "negative" financial actions: Give Udhaar CTA, Cash Out, Expenses, low-stock badges |

### Usage rules
- Background is **always** `canvas`; cards/modals sit on `surface`. Never reintroduce the old dark
  `brand-black`/`brand-charcoal` tokens or the retired purple `primary` (`#6D4AFF`) — this is the Ocean Wave
  palette, and hex values belong in `app/globals.css` custom properties only, never hardcoded in components.
- Body text is `ink` at full opacity. Secondary/meta text uses `ink-secondary`; only placeholders and the
  least important labels use `ink-tertiary`.
- **Color is used carefully, never as a page-wide wash.** `danger` (soft, `danger-light` background) is
  reserved for destructive delete/remove confirmations and Receivable/Give-Udhaar tints. `warning` (solid
  fill) is the CTA color for legitimate outflow actions — Give Udhaar's "Save Udhaar" button, Cash Out,
  Expenses — coding them as "negative" without turning the whole screen red.
- `success` (solid fill) is the CTA color for Receive Payment / Cash In / Payable tints.
- `primary` (ocean blue) is the default brand color: navigation, active states, neutral primary buttons,
  links, and the Cash/Sale tint.
- `accent` (purple-blue) is reserved for Bank & Wallet and Add Customer — keeps those visually distinct from
  the primary blue used for Cash/Sale without introducing a third unrelated hue.
- Hero/summary balance cards (Dashboard totals, Khata totals, Cashbook current cash, Sales total, Bank &
  Wallet totals, Customer Detail balance) get a light `-light` tint background matching their financial
  category; dense multi-metric grids (Reports) and plain lists stay neutral `surface` so the app doesn't read
  as over-colored.
- Minimum contrast ratio: **4.5:1** for body text, **3:1** for large text (≥ 24px) and icons — verified for
  every token pair above against `surface`/`canvas` before shipping.

## 2. Typography

Elderly users need larger-than-default type and generous spacing. Rules:

- **Root font size is bumped to 18px** (`html { font-size: 112.5% }` in `globals.css`), so every Tailwind
  `rem`-based utility scales up automatically — this is the single most impactful accessibility change.
- **Minimum body text size: 16px effective / `text-base` and up.** Never use `text-xs` for content the user
  must read to complete a task (balances, names, amounts). `text-xs`/`text-sm` are reserved for legal
  footers and non-critical metadata only.
- **Financial figures (balances, amounts) are always the largest element on screen** — use `text-3xl` and
  `font-bold` for the current balance number. Prefer the shared `<Amount>` component (see §8) over a raw
  number so figures get the count-up/pop treatment automatically.
- **Line height**: minimum `leading-relaxed` (1.625) for paragraphs; headings can use `leading-snug`.
- **Font weight**: body copy `font-medium` minimum. Headings `font-bold`.
- **Avoid long strings of uppercase text** — uppercase is fine for short labels/badges (≤ 2 words, e.g.
  section headers in More) but never for sentences.
- **Numerals**: always tabular/monospaced (`font-variant-numeric: tabular-nums`) so digits don't jitter.
- Font: `next/font` self-hosted Inter — excellent numeral and letter distinction at large sizes.

## 3. Spacing & Touch Targets

- **Minimum tap target: 48×48px** (`min-h-tap`/`min-w-tap` utilities) — applies to every button, icon
  button, checkbox, and list row.
- Minimum 8px gap between adjacent interactive elements to prevent accidental mis-taps.
- Primary screen padding: `px-4` mobile / more breathing room tablet+, never edge-to-edge content.
- Forms: one input focus per row, large labels above (not placeholder-only) inputs, `min-h-tap` input
  height. Every native `<input>`/`<select>`/`<textarea>` outside a row-flex context must be `w-full` (and
  any input placed in a `flex-1` row must also carry `min-w-0`) — form controls have a large content-based
  minimum width by default and will silently force horizontal overflow inside a modal otherwise.
- **Fewer, purposeful cards.** Don't wrap every section in its own card; group related content and let
  plain spacing do the separating where a card doesn't add meaning.

## 4. Icons

- One consistent hand-rolled SVG icon set (`components/icons/Icon.tsx`, ~40 icons, 24×24 stroke-based,
  `currentColor`) — no icon library dependency, no emoji anywhere in the UI. Add new glyphs to this file
  rather than mixing in a second icon source.
- Icon-only buttons (edit, delete, close) must still carry an `aria-label`.

## 5. Buttons

Buttons are the highest-stakes UI element in a finance app for this audience — feedback must be immediate
and unambiguous. Always use the shared `<Button>` component (`components/ui/Button.tsx`) rather than a raw
`<button>` so ripple, sizing, and loading states stay consistent.

### Variants
| Variant | Style | Use for |
|---|---|---|
| `primary` | Solid `primary` ocean blue | Default/neutral primary actions |
| `success` | Solid `success` green | Receive Payment, Cash In, any inflow save |
| `warning` | Solid `warning` orange | Give Udhaar, Cash Out, expense save — "negative" but routine actions |
| `danger` | Soft `danger-light` fill, `danger` text | Destructive delete/remove only |
| `secondary` | Soft `primary-light` fill, `primary` text | Secondary actions (Add Items, Change photo) |
| `ghost` | Transparent, `ink-secondary` text | Tertiary/cancel actions |

### States
- Active/Pressed: `scale-[0.98]` + a variant-tinted ripple spawned from the press point, `500ms ease-out`,
  respects `prefers-reduced-motion` (skipped, no JS work needed since it's a CSS animation).
- Disabled: `surface-alt` background, `ink-tertiary` text, no ripple.
- Loading: spinner + "Saving…" replaces label; button stays disabled.
- Focus (keyboard): `outline outline-2 outline-offset-2 outline-primary` — never remove focus outlines.
- No glow effect — retired with the dark theme. Soft `shadow-card`/`shadow-elevated` (see `tailwind.config.ts`)
  is the only elevation cue; never a colored glowing box-shadow.

## 6. Skeleton Screens

- Skeleton shapes must match the real component's exact dimensions and border radius.
- Shimmer sweep: `surface-dim` → `canvas` → `surface-dim`, `2s linear infinite`
  (`bg-shimmer-gradient bg-shimmer-size animate-shimmer`).
- Always include `role="status"` and an `aria-label` on the skeleton container.
- Show skeletons for a minimum of ~300ms even on fast connections; replace with real content the moment
  data resolves.

## 7. Motion & Accessibility

- Respect `prefers-reduced-motion: reduce` globally (enforced in `globals.css`) — all animation/transition
  durations collapse to ~0.
- Entrance animations: `animate-fade-in-up` (list rows, page content), `animate-scale-in` (desktop modals),
  `animate-slide-up-sheet` (mobile modals), `animate-toast-in` (toasts) — all 150–220ms, defined in
  `tailwind.config.ts`.
- `<Amount>` (`components/ui/Amount.tsx`) gives financial totals a brief count-up + `animate-value-pop` pulse
  whenever their value changes — use it instead of printing a raw number for any balance/total.
- No auto-playing carousels or content that moves without user action.
- Icons paired with a text label for primary actions — icon-only buttons only for established patterns
  (back arrow, close "×", edit/delete in a list row) and must carry an `aria-label`.

## 8. Component Checklist (new component definition of done)

- [ ] Meets 48×48px minimum tap target (if interactive)
- [ ] Passes 4.5:1 contrast for text, 3:1 for large text/icons
- [ ] Uses only tokens from `tailwind.config.ts` (no ad-hoc hex values, no `brand-*` classes)
- [ ] Uses the shared `Icon`/`Button`/`Amount`/`Badge`/`TextField`/`Modal` primitives rather than one-off markup
- [ ] Has a skeleton or `EmptyState` for async/empty data
- [ ] Respects `prefers-reduced-motion`
- [ ] Keyboard-operable with visible focus ring
- [ ] Any native `<input>`/`<select>`/`<textarea>` is `w-full` (or `min-w-0` if it's a flex-1 row item)
