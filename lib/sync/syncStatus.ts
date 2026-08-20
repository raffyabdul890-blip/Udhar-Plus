const STORAGE_KEY_PREFIX = "udhar-plus-last-synced-at";

function storageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

/** Client-side record of when this device's data last finished pushing to Supabase — read by the Backup & Sync card in More. */
export function getLastSyncedAt(userId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(storageKey(userId));
}

export function markSyncedNow(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), new Date().toISOString());
}
