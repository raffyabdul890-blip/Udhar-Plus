/**
 * Synchronous localStorage mirror of the theme/language preference. The
 * source of truth for cross-device sync is LocalBusinessSettings (Dexie,
 * synced to Supabase, scoped per user) — but a Dexie read is always async,
 * so it can't run inside the blocking inline script in app/layout.tsx that
 * sets data-theme/dir before first paint, and that script also runs on
 * /login before any user is known. This mirror is deliberately device-level
 * (not per-user, unlike lib/onboarding.ts's flag) — it's what that script
 * reads instead, and PreferencesProvider reconciles it against the signed-in
 * user's synced preference once one is available.
 */
const THEME_KEY = "udhar-plus-theme";
const LANGUAGE_KEY = "udhar-plus-language";

export type ThemePreference = "light" | "dark" | "system";
export type LanguagePreference = "en" | "ur";

export function getLocalTheme(): ThemePreference {
  if (typeof window === "undefined") return "light";
  const value = window.localStorage.getItem(THEME_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : "light";
}

export function setLocalTheme(theme: ThemePreference): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, theme);
}

export function getLocalLanguage(): LanguagePreference {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem(LANGUAGE_KEY) === "ur" ? "ur" : "en";
}

export function setLocalLanguage(language: LanguagePreference): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANGUAGE_KEY, language);
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
