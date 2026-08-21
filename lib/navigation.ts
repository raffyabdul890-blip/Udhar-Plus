/**
 * Server-safe (no "use client") — app/page.tsx, a Server Component, needs to
 * validate the `?tab=` search param before it can render. A "use client"
 * module's exports become opaque client references once bundled, so a plain
 * function like isBottomTabId can't be called from server code even though
 * it has no browser dependency; keeping the pure id list + validator here
 * (with BottomNav.tsx re-exporting the type for its existing consumers) lets
 * both sides use the same source of truth.
 */
export type BottomTabId = "dashboard" | "khata" | "cashbook" | "sales" | "items" | "reports" | "bank" | "more";

const BOTTOM_TAB_IDS: readonly BottomTabId[] = [
  "dashboard",
  "khata",
  "cashbook",
  "sales",
  "items",
  "reports",
  "bank",
  "more",
];

/** Validates a value (e.g. the `?tab=` URL param) against the real tab list. */
export function isBottomTabId(value: string | undefined | null): value is BottomTabId {
  return BOTTOM_TAB_IDS.includes(value as BottomTabId);
}
