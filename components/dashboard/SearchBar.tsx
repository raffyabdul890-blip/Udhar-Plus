"use client";

import Icon from "@/components/icons/Icon";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export default function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { t } = usePreferences();

  return (
    <div className="relative">
      <Icon
        name="search"
        size={19}
        className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("khata.searchPlaceholder")}
        aria-label={t("common.search")}
        className="min-h-tap w-full rounded-xl border border-border bg-surface ps-11 pe-4 text-senior-base text-ink placeholder:text-ink-tertiary transition focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
    </div>
  );
}
