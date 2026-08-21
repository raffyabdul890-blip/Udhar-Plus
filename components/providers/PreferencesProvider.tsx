"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  getLocalLanguage,
  getLocalTheme,
  resolveTheme,
  setLocalLanguage,
  setLocalTheme,
  type LanguagePreference,
  type ThemePreference,
} from "@/lib/preferences/localMirror";
import { translate, type Language } from "@/lib/i18n/translate";

type PreferencesContextValue = {
  theme: ThemePreference;
  /** "system" resolved to a concrete "light"/"dark" — what data-theme is actually set to. */
  resolvedTheme: "light" | "dark";
  /** Local-only: updates localStorage + <html data-theme>. Callers that need cross-device sync also call saveBusinessSettings themselves (they have userId in scope; this provider deliberately doesn't). */
  setTheme: (theme: ThemePreference) => void;
  language: Language;
  dir: "ltr" | "rtl";
  setLanguage: (language: LanguagePreference) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const THEME_COLOR: Record<"light" | "dark", string> = {
  light: "#F5FAFE",
  dark: "#0B0C10",
};

function applyToDocument(resolvedTheme: "light" | "dark", language: Language) {
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme;
  root.lang = language;
  root.dir = language === "ur" ? "rtl" : "ltr";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[resolvedTheme]);
}

export default function PreferencesProvider({ children }: { children: React.ReactNode }) {
  // Theme's lazy initializer reads the same localStorage the blocking inline
  // script (app/layout.tsx) already used to set data-theme before this
  // component ever mounts. That's hydration-safe because resolvedTheme never
  // appears in rendered JSX — it only drives an imperative DOM mutation
  // (applyToDocument, below), which React's hydration diff never inspects.
  //
  // Language is different: it flows into every t() call, i.e. straight into
  // rendered text. A lazy initializer reading localStorage here would make
  // the client's first render diverge from the server's (which always sees
  // "en", since localStorage doesn't exist during SSR) — a real hydration
  // mismatch for any returning Urdu user, not just a cosmetic warning. So
  // this always starts at the SSR-matching default and self-corrects in a
  // layout effect (before paint, so there's no visible flash) rather than in
  // the initializer.
  const [theme, setThemeState] = useState<ThemePreference>(() => getLocalTheme());
  const [language, setLanguageState] = useState<Language>("en");

  useLayoutEffect(() => {
    // Synchronizing with localStorage (an external store unavailable during
    // SSR) before paint, not deriving state from props — the textbook valid
    // effect use case, just one the lint rule can't tell apart.
    const stored = getLocalLanguage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored !== "en") setLanguageState(stored);
  }, []);

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  useEffect(() => {
    applyToDocument(resolvedTheme, language);
  }, [resolvedTheme, language]);

  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyToDocument(resolveTheme("system"), language);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme, language]);

  const setTheme = useCallback((next: ThemePreference) => {
    setLocalTheme(next);
    setThemeState(next);
  }, []);

  const setLanguage = useCallback((next: LanguagePreference) => {
    setLocalLanguage(next);
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language]
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      language,
      dir: language === "ur" ? "rtl" : "ltr",
      setLanguage,
      t,
    }),
    [theme, resolvedTheme, setTheme, language, setLanguage, t]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
