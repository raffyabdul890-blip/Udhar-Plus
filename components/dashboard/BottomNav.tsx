import Icon, { type IconName } from "@/components/icons/Icon";

export type BottomTabId = "dashboard" | "khata" | "cashbook" | "sales" | "items" | "reports" | "bank" | "more";

export const NAV_ITEMS: { id: BottomTabId; icon: IconName; label: string }[] = [
  { id: "dashboard", icon: "dashboard", label: "Dashboard" },
  { id: "khata", icon: "khata", label: "Khata" },
  { id: "cashbook", icon: "cashbook", label: "Cashbook" },
  { id: "sales", icon: "sales", label: "Sales" },
  { id: "items", icon: "items", label: "Items" },
  { id: "reports", icon: "reports", label: "Reports" },
  { id: "bank", icon: "bank", label: "Bank & Wallet" },
  { id: "more", icon: "more", label: "More" },
];

/** Most-used destinations only — bottom nav stays uncluttered; Sales/Reports/Bank live on Dashboard + More. */
const MOBILE_TAB_IDS: BottomTabId[] = ["dashboard", "khata", "cashbook", "items", "more"];
const MOBILE_TABS = MOBILE_TAB_IDS.map((id) => NAV_ITEMS.find((item) => item.id === id)!);

export default function BottomNav({
  active,
  onChange,
}: {
  active: BottomTabId;
  onChange: (tab: BottomTabId) => void;
}) {
  const activeIndex = Math.max(0, MOBILE_TABS.findIndex((tab) => tab.id === active));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t border-border bg-surface/95 backdrop-blur lg:hidden relative"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1.5 h-[3px] w-[20%] rounded-full bg-primary transition-[left] duration-200 ease-out"
        style={{ left: `${activeIndex * 20}%` }}
      />
      {MOBILE_TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={selected ? "page" : undefined}
            className="flex min-h-tap flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-senior-xs font-bold transition-colors"
          >
            <span
              className={`flex items-center justify-center rounded-full px-3 py-1 transition-all duration-200 ${
                selected ? "bg-primary-light text-primary" : "text-ink-tertiary"
              }`}
            >
              <Icon name={tab.icon} size={21} />
            </span>
            <span className={selected ? "text-primary" : "text-ink-tertiary"}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
