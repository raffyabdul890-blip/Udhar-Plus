"use client";

import Icon, { type IconName } from "@/components/icons/Icon";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export type QuickActionId = "give" | "receive" | "customer" | "expense" | "sale";

const TILES: { id: QuickActionId; icon: IconName; labelKey: string; card: string; badge: string }[] = [
  { id: "give", icon: "khata", labelKey: "dashboard.giveUdhaar", card: "bg-danger-light", badge: "bg-danger text-white" },
  { id: "receive", icon: "cash-in", labelKey: "dashboard.receivePayment", card: "bg-success-light", badge: "bg-success text-white" },
  { id: "customer", icon: "user", labelKey: "dashboard.addCustomer", card: "bg-accent-light", badge: "bg-accent text-white" },
  { id: "expense", icon: "cash-out", labelKey: "dashboard.addExpense", card: "bg-warning-light", badge: "bg-warning text-white" },
  { id: "sale", icon: "sales", labelKey: "dashboard.newSale", card: "bg-primary-light", badge: "bg-primary text-white" },
];

export default function QuickActions({
  onAction,
}: {
  onAction: (id: QuickActionId) => void;
}) {
  const { t } = usePreferences();

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {TILES.map((tile, i) => (
        <button
          key={tile.id}
          type="button"
          onClick={() => onAction(tile.id)}
          className={`flex min-h-tap flex-col items-center justify-center gap-2 rounded-2xl border border-transparent ${tile.card} px-3 py-5 text-center shadow-card transition active:scale-[0.97] ${
            i === TILES.length - 1 && TILES.length % 2 === 1 ? "col-span-2 lg:col-span-1" : ""
          }`}
        >
          <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tile.badge}`}>
            <Icon name={tile.icon} size={22} />
          </span>
          <span className="text-senior-sm font-bold text-ink">{t(tile.labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
