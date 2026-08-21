"use client";

import Icon from "@/components/icons/Icon";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import type { LanguagePreference } from "@/lib/preferences/localMirror";

const OPTIONS: { value: LanguagePreference; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ur", label: "اردو" },
  { value: "ur-Latn", label: "Roman Urdu" },
];

export default function LanguageSelector({ onChange }: { onChange: (language: LanguagePreference) => void }) {
  const { language } = usePreferences();

  return (
    <div className="flex gap-2">
      {OPTIONS.map((option) => {
        const selected = language === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            dir={option.value === "ur" ? "rtl" : "ltr"}
            className={`flex min-h-tap flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-senior-base font-bold transition-all duration-150 active:scale-[0.98] ${
              selected ? "border-primary bg-primary text-white" : "border-border bg-surface text-ink-secondary hover:bg-surface-alt"
            }`}
          >
            {selected && <Icon name="check" size={16} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
