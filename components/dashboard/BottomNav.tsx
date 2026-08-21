"use client";

import Icon, { type IconName } from "@/components/icons/Icon";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export type BottomTabId = "dashboard" | "khata" | "cashbook" | "sales" | "items" | "reports" | "bank" | "more";

/** id doubles as the nav.* translation key (e.g. "bank" -> nav.bank) — see lib/i18n/translations. */
export const NAV_ITEMS: { id: BottomTabId; icon: IconName }[] = [
  { id: "dashboard", icon: "dashboard" },
  { id: "khata", icon: "khata" },
  { id: "cashbook", icon: "cashbook" },
  { id: "sales", icon: "sales" },
  { id: "items", icon: "items" },
  { id: "reports", icon: "reports" },
  { id: "bank", icon: "bank" },
  { id: "more", icon: "more" },
];

/** Most-used destinations only — bottom nav stays uncluttered; Sales/Reports/Bank live on Dashboard + More. */
const MOBILE_TAB_IDS: BottomTabId[] = ["dashboard", "khata", "cashbook", "items", "more"];
const MOBILE_TABS = MOBILE_TAB_IDS.map((id) => NAV_ITEMS.find((item) => item.id === id)!);

/** Validates a value (e.g. the `?tab=` URL param) against the real tab list — single source of truth for both the nav UI and DashboardShell's refresh-persistence fallback. */
export function isBottomTabId(value: string | undefined | null): value is BottomTabId {
  return NAV_ITEMS.some((item) => item.id === value);
}

export default function BottomNav({
  active,
  onChange,
}: {
  active: BottomTabId;
  onChange: (tab: BottomTabId) => void;
}) {
  const { t } = usePreferences();
  const activeIndex = Math.max(0, MOBILE_TABS.findIndex((tab) => tab.id === active));

  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md gap-1 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1.5 h-[3px] w-[20%] rounded-full bg-primary transition-[inset-inline-start] duration-200 ease-out"
        style={{ insetInlineStart: `${activeIndex * 20}%` }}
      />
      {MOBILE_TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={selected ? "page" : undefined}
            className="flex min-h-tap flex-1 flex-col items-center justify-center gap-0.5 py-2 text-senior-xs font-bold transition-colors"
          >
            <span
              className={`flex items-center justify-center rounded-full px-2.5 py-0.5 transition-all duration-200 ${
                selected ? "bg-primary-light text-primary" : "text-ink-tertiary"
              }`}
            >
              <Icon name={tab.icon} size={19} />
            </span>
            <span className={selected ? "text-primary" : "text-ink-tertiary"}>{t(`nav.${tab.id}`)}</span>
          </button>
        );
      })}
    </nav>
  );
}
