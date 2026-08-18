export type DashboardModule = "customers" | "banks";

export default function ModuleSwitcher({
  active,
  onChange,
}: {
  active: DashboardModule;
  onChange: (module: DashboardModule) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Modules"
      className="flex gap-2 rounded-xl bg-brand-charcoal/40 p-1"
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "customers"}
        onClick={() => onChange("customers")}
        className={`min-h-tap flex-1 rounded-lg text-senior-base font-bold transition ${
          active === "customers" ? "bg-brand-red text-brand-white" : "text-brand-white/70"
        }`}
      >
        🛒 Customer Khata
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "banks"}
        onClick={() => onChange("banks")}
        className={`min-h-tap flex-1 rounded-lg text-senior-base font-bold transition ${
          active === "banks" ? "bg-brand-red text-brand-white" : "text-brand-white/70"
        }`}
      >
        🏦 Bank & Wallet
      </button>
    </div>
  );
}
