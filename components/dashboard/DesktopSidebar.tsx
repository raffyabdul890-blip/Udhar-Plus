"use client";

import Image from "next/image";
import Icon from "@/components/icons/Icon";
import { NAV_ITEMS, type BottomTabId } from "@/components/dashboard/BottomNav";
import { usePreferences } from "@/components/providers/PreferencesProvider";

const PRIMARY_ITEMS = NAV_ITEMS.filter((item) => item.id !== "more");
const MORE_ITEM = NAV_ITEMS.find((item) => item.id === "more")!;

/** Left rail shown at `lg:` and up — BottomNav stays the mobile source of truth for the tab list. */
export default function DesktopSidebar({
  active,
  onChange,
  primaryLabel,
}: {
  active: BottomTabId;
  onChange: (tab: BottomTabId) => void;
  primaryLabel: string;
}) {
  const { t } = usePreferences();

  return (
    <nav
      aria-label={t("nav.mainDesktop")}
      className="hidden w-64 shrink-0 flex-col gap-1 border-e border-border bg-surface px-3 py-6 lg:flex"
    >
      <div className="flex items-center gap-2 px-3 pb-6">
        <Image
          src="/icons/icon-512.png"
          alt="Udhar Plus"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-lg"
        />
        <p className="truncate text-senior-lg font-bold text-ink">{primaryLabel}</p>
      </div>

      {PRIMARY_ITEMS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-tap items-center gap-3 rounded-xl px-3 text-senior-base font-bold transition-colors duration-150 ${
              selected ? "bg-primary-light text-primary" : "text-ink-secondary hover:bg-surface-alt"
            }`}
          >
            <Icon name={tab.icon} size={20} />
            <span>{t(`nav.${tab.id}`)}</span>
          </button>
        );
      })}

      <div className="my-3 border-t border-border" />

      <button
        type="button"
        onClick={() => onChange(MORE_ITEM.id)}
        aria-current={active === MORE_ITEM.id ? "page" : undefined}
        className={`flex min-h-tap items-center gap-3 rounded-xl px-3 text-senior-base font-bold transition-colors duration-150 ${
          active === MORE_ITEM.id ? "bg-primary-light text-primary" : "text-ink-secondary hover:bg-surface-alt"
        }`}
      >
        <Icon name={MORE_ITEM.icon} size={20} />
        <span>{t("nav.settings")}</span>
      </button>
    </nav>
  );
}
