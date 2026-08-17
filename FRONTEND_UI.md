# Udhar Plus — Frontend UI Guidelines

Audience note: primary users skew older and may have reduced vision, dexterity, or smartphone
familiarity. Every rule below exists to reduce misreads and mis-taps. When in doubt, choose the larger,
higher-contrast, more forgiving option.

## 1. Color System

| Token | Hex | Role |
|---|---|---|
| `brand-red` | `#DA0000` | Primary actions (buttons, "Give Udhar" CTA), active states, brand accent |
| `brand-black` | `#000000` | Main app background (dark mode by default) |
| `brand-white` | `#FFFFFF` | High-contrast text/icons on dark surfaces |
| `brand-charcoal` | `#574D4C` | Card backgrounds, dividers, input borders, disabled states |
| `brand-darkred` | `#830F10` | Pressed/hover state for red actions, AI/insight highlights, danger emphasis |

### Usage rules
- Background is **always** `brand-black`. Never use pure grays outside `brand-charcoal`.
- Body text is `brand-white` at full opacity — do not use low-opacity white for primary text (fails
  contrast for low-vision users). Opacity reduction is only allowed for placeholder/hint text, and even
  then must stay ≥ `70%` white.
- `brand-red` is reserved for the single primary action per screen (e.g., "Give Udhar", "Save"). Do not use
  it for more than one competing CTA on the same view.
- `brand-darkred` is the pressed/active variant of `brand-red` (button `:active` state) and is also used for
  AI-generated insight callouts (e.g., "Udhar Plus AI" summary cards) so users learn to associate it with
  system-generated content.
- `brand-charcoal` cards must always sit on `brand-black` background with a `1px` `brand-charcoal`-derived
  lighter border (e.g., `rgba(255,255,255,0.08)`) so card edges remain visible without adding a new color.
- Minimum contrast ratio: **4.5:1** for body text, **3:1** for large text (≥ 24px) and icons — verify any
  new color combination against WCAG AA before shipping. White-on-black and white-on-charcoal both pass
  comfortably; red-on-black passes for large text/buttons only, never for small body copy.

## 2. Typography

Elderly users need larger-than-default type and generous spacing. Rules:

- **Root font size is bumped to 18px** (`html { font-size: 112.5% }` in `globals.css`), so every Tailwind
  `rem`-based utility scales up automatically — this is the single most impactful accessibility change.
- **Minimum body text size: 16px effective / `text-base` and up.** Never use `text-xs` for content the user
  must read to complete a task (balances, names, amounts). `text-xs`/`text-sm` are reserved for legal
  footers and non-critical metadata only.
- **Financial figures (balances, amounts) are always the largest element on screen** — use `text-3xl` /
  `text-4xl` and `font-bold` for the current balance number.
- **Line height**: minimum `leading-relaxed` (1.625) for paragraphs; headings can use `leading-snug`.
- **Font weight**: body copy `font-medium` minimum (400-weight thin text is hard to read on dark
  backgrounds at distance). Headings `font-bold`.
- **Avoid long strings of uppercase text** — uppercase is fine for short labels/badges (≤ 2 words) but
  never for sentences; it slows reading comprehension for aging eyes.
- **Numerals**: always use tabular/monospaced number rendering for amounts (`font-variant-numeric:
  tabular-nums`) so digits don't jitter when balances update.
- Font: system-optimized via `next/font` (self-hosted, no external network requests). Default: Inter,
  which has excellent numeral and letter distinction at large sizes. Swap for `next/font/local` if a
  custom brand font is supplied later.

## 3. Spacing & Touch Targets

- **Minimum tap target: 48×48px** (WCAG 2.5.5 AAA, and the safer bar given reduced dexterity) — applies to
  every button, icon button, checkbox, and list row.
- Minimum 8px gap between adjacent interactive elements to prevent accidental mis-taps.
- Primary screen padding: `px-4` mobile / `px-6` tablet+, never edge-to-edge content.
- Forms: one input focus per row, large labels above (not placeholder-only) inputs, generous `py-3`+ input
  height.

## 4. Buttons — States, Ripple & Glow

Buttons are the highest-stakes UI element in a finance app for this audience — feedback must be immediate
and unambiguous.

### States
| State | Style |
|---|---|
| Default (primary) | `bg-brand-red text-brand-white`, `rounded-xl`, `min-h-[48px]` |
| Hover (pointer devices) | Slight lift: `brightness-110` |
| Active/Pressed | `bg-brand-darkred` + ripple animation fires + `scale-[0.98]` |
| Disabled | `bg-brand-charcoal text-brand-white/50`, no ripple/glow, `cursor-not-allowed` |
| Focus (keyboard) | `outline outline-2 outline-offset-2 outline-brand-white` — never remove focus outlines |

### Ripple spec
- On press (`pointerdown`), spawn a circular `brand-white/30` overlay at the touch point, scale from `0`
  to cover the button's largest dimension, fade out.
- Duration: **450ms**, easing: `ease-out`.
- Implementation: a `useRipple` hook attaching a `<span>` per press; respects `prefers-reduced-motion` (see
  §6) by skipping the scale animation and using a simple opacity flash instead.
- Tailwind hook: `animate-ripple` (keyframe defined in `tailwind.config.ts`) — scales `0 → 4` while fading
  opacity `0.4 → 0`.

### Glow spec
- Used to draw attention to the single primary action on a screen (e.g., "Give Udhar" on an empty
  dashboard) and for AI-highlighted content using `brand-darkred`.
- `box-shadow` pulse: `0 0 0px` → `0 0 16px` of the button's own color at 60% opacity → back to `0 0 0px`.
- Duration: **2.2s**, `ease-in-out`, infinite loop, only while the button is idle (glow stops once pressed
  or once the user completes the action it's highlighting).
- Tailwind hook: `animate-glow` (keyframe `glow` defined in `tailwind.config.ts`).
- Never combine glow on more than one element at a time — competing glows defeat the purpose.

## 5. Skeleton Screens

Skeletons are used instead of spinners for any content that has a predictable shape (customer cards,
balance cards, lists) — they reduce perceived load time and prevent layout shift, which is especially
important for users who may tap prematurely while content is still loading.

### Pattern rules
- Skeleton shapes must match the real component's exact dimensions and border radius — no generic gray
  boxes.
- Shimmer sweep: a soft gradient band moves left → right across `brand-charcoal` blocks.
  - Gradient stops: `brand-charcoal` → lightened charcoal (`#6b6060`) → `brand-charcoal`.
  - Duration: **2s linear infinite**.
  - Tailwind hooks: `bg-shimmer-gradient bg-shimmer-size animate-shimmer` (defined in
    `tailwind.config.ts`).
- Always include `role="status"` and a visually-hidden `aria-label="Loading…"` on the skeleton container so
  screen readers announce loading state once, not per shimmering block.
- Use skeletons for: dashboard balance card, customer list rows, customer profile header, reports charts.
- Use a spinner instead only for full-screen transitions with no predictable layout (e.g., initial app
  boot before any shell renders).
- Show skeletons for a minimum of ~300ms even on fast connections (avoid a jarring flash-then-replace);
  never show them for longer than necessary — replace with real content the moment data resolves.

## 6. Motion & Accessibility

- Respect `prefers-reduced-motion: reduce` globally: ripple becomes an opacity flash, glow pulse becomes a
  static highlight ring, shimmer becomes a static two-tone block (no sweep).
- No auto-playing carousels or content that moves without user action.
- All interactive elements are reachable and operable via keyboard/switch-access, with visible focus
  states (§4).
- Icons always paired with a text label for primary actions — icon-only buttons only for well-established
  patterns (back arrow, close "×") and must still carry an `aria-label`.

## 7. Component Checklist (new component definition of done)

- [ ] Meets 48×48px minimum tap target (if interactive)
- [ ] Passes 4.5:1 contrast for text, 3:1 for large text/icons
- [ ] Uses only brand tokens from `tailwind.config.ts` (no ad-hoc hex values)
- [ ] Has a skeleton or loading state if it renders async data
- [ ] Respects `prefers-reduced-motion`
- [ ] Keyboard-operable with visible focus ring
