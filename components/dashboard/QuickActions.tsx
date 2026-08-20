"use client";

import Icon, { type IconName } from "@/components/icons/Icon";

export type QuickActionId = "give" | "receive" | "customer" | "expense" | "sale";

const TILES: { id: QuickActionId; icon: IconName; label: string; tint: string }[] = [
  { id: "give", icon: "khata", label: "Give Udhaar", tint: "bg-danger-light text-danger-dark" },
  { id: "receive", icon: "cash-in", label: "Receive Payment", tint: "bg-success-light text-success-dark" },
  { id: "customer", icon: "user", label: "Add Customer", tint: "bg-primary-light text-primary" },
  { id: "expense", icon: "cash-out", label: "+ Expense", tint: "bg-warning-light text-warning" },
  { id: "sale", icon: "sales", label: "+ Sale", tint: "bg-primary-light text-primary" },
];

export default function QuickActions({
  onAction,
}: {
  onAction: (id: QuickActionId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {TILES.map((tile, i) => (
        <button
          key={tile.id}
          type="button"
          onClick={() => onAction(tile.id)}
          className={`flex min-h-tap flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 py-5 text-center shadow-card transition active:scale-[0.97] active:bg-surface-alt ${
            i === TILES.length - 1 && TILES.length % 2 === 1 ? "col-span-2 lg:col-span-1" : ""
          }`}
        >
          <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tile.tint}`}>
            <Icon name={tile.icon} size={22} />
          </span>
          <span className="text-senior-sm font-bold text-ink">{tile.label}</span>
        </button>
      ))}
    </div>
  );
}
