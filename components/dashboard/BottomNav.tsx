export type BottomTabId = "khata" | "cashbook" | "items" | "reports" | "more";

const TABS: { id: BottomTabId; icon: string; label: string; labelUrdu: string }[] = [
  { id: "khata", icon: "🧾", label: "Customers", labelUrdu: "کھاتہ" },
  { id: "cashbook", icon: "💵", label: "Cashbook", labelUrdu: "کیش بک" },
  { id: "items", icon: "📦", label: "Items", labelUrdu: "اسٹاک" },
  { id: "reports", icon: "📊", label: "Reports", labelUrdu: "رپورٹس" },
  { id: "more", icon: "⚙️", label: "More", labelUrdu: "مزید" },
];

export default function BottomNav({
  active,
  onChange,
}: {
  active: BottomTabId;
  onChange: (tab: BottomTabId) => void;
}) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t border-brand-white/10 bg-brand-charcoal"
    >
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-tap flex-1 flex-col items-center justify-center gap-0.5 py-2 text-senior-xs font-bold transition ${
              selected ? "text-brand-red" : "text-brand-white/70"
            }`}
          >
            <span aria-hidden="true" className="text-senior-lg leading-none">
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            <span dir="rtl" className="text-senior-xs">
              {tab.labelUrdu}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
