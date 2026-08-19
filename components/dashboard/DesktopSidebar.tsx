import { DASHBOARD_TABS, type BottomTabId } from "@/components/dashboard/BottomNav";

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
  return (
    <nav
      aria-label="Main (desktop)"
      className="hidden w-64 shrink-0 flex-col gap-1 border-r border-brand-white/10 bg-brand-charcoal/20 px-3 py-6 lg:flex"
    >
      <p className="truncate px-3 pb-6 text-senior-lg font-bold text-brand-white">{primaryLabel}</p>

      {DASHBOARD_TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-tap items-center gap-3 rounded-xl px-3 text-senior-base font-bold transition ${
              selected ? "bg-brand-red text-brand-white" : "text-brand-white/70 hover:bg-brand-white/5"
            }`}
          >
            <span aria-hidden="true" className="text-senior-lg leading-none">
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            <span dir="rtl" className="ml-auto text-senior-xs opacity-70">
              {tab.labelUrdu}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
