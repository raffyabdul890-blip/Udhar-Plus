import en from "./translations/en";
import ur from "./translations/ur";
import roman from "./translations/roman";

/** "ur-Latn" = Urdu written in Latin/Roman script — the BCP-47 subtag for it, not just an arbitrary label. Always LTR, unlike "ur". */
export type Language = "en" | "ur" | "ur-Latn";

const DICTIONARIES: Record<Language, Record<string, unknown>> = { en, ur, "ur-Latn": roman };

function lookup(dict: Record<string, unknown>, path: string): string | undefined {
  let node: unknown = dict;
  for (const segment of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

/** Dotted-path lookup (e.g. "dashboard.title") — falls back to English for any key missing from the active language, and to the raw key itself if even English lacks it, so a typo never renders blank. */
export function translate(
  language: Language,
  key: string,
  vars?: Record<string, string | number>
): string {
  const template = lookup(DICTIONARIES[language], key) ?? lookup(en, key) ?? key;
  return interpolate(template, vars);
}
