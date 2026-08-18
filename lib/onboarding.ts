const STORAGE_KEY_PREFIX = "udhar-plus-onboarding-completed";

function storageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

/**
 * Client-side, per-user cache of "has this person been through (or skipped) the
 * welcome screen" — checked alongside Supabase user_metadata so the welcome
 * screen never re-appears on refresh even if the metadata write hasn't landed
 * yet (e.g. right after a skip attempted while offline).
 */
export function isOnboardingCompleteLocally(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(storageKey(userId)) === "true";
}

export function markOnboardingCompleteLocally(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), "true");
}
