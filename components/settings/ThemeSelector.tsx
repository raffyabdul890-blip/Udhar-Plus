"use client";

import Icon, { type IconName } from "@/components/icons/Icon";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import type { ThemePreference } from "@/lib/preferences/localMirror";

const OPTIONS: { value: ThemePreference; icon: IconName; titleKey: string; descriptionKey: string }[] = [
  { value: "light", icon: "sun", titleKey: "settings.themeLight", descriptionKey: "settings.themeLightDescription" },
  { value: "dark", icon: "moon", titleKey: "settings.themeDark", descriptionKey: "settings.themeDarkDescription" },
  { value: "system", icon: "monitor", titleKey: "settings.themeSystem", descriptionKey: "settings.themeSystemDescription" },
];

export default function ThemeSelector({ onChange }: { onChange: (theme: ThemePreference) => void }) {
  const { theme, t } = usePreferences();

  return (
    <div className="flex flex-col gap-2">
      {OPTIONS.map((option) => {
        const selected = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={`flex min-h-tap w-full items-center gap-3 rounded-xl border px-4 py-3 text-start transition-all duration-150 active:scale-[0.99] ${
              selected ? "border-primary bg-primary-light" : "border-border bg-surface hover:bg-surface-alt"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${
                selected ? "bg-primary text-white" : "bg-surface-alt text-ink-secondary"
              }`}
            >
              <Icon name={option.icon} size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-senior-base font-bold ${selected ? "text-primary" : "text-ink"}`}>
                {t(option.titleKey)}
              </p>
              <p className="truncate text-senior-xs text-ink-secondary">{t(option.descriptionKey)}</p>
            </div>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${
                selected ? "scale-100 bg-primary text-white opacity-100" : "scale-75 opacity-0"
              }`}
            >
              <Icon name="check" size={14} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
