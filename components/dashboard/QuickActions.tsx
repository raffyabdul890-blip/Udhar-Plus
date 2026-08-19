"use client";

import Icon, { type IconName } from "@/components/icons/Icon";

const TILES: { id: "give" | "receive" | "expense" | "sale"; icon: IconName; label: string; tint: string }[] = [
  { id: "give", icon: "khata", label: "Give Udhaar", tint: "bg-danger-light text-danger-dark" },
  { id: "receive", icon: "cash-in", label: "Receive Payment", tint: "bg-success-light text-success-dark" },
  { id: "expense", icon: "cash-out", label: "+ Expense", tint: "bg-warning-light text-warning" },
  { id: "sale", icon: "sales", label: "+ Sale", tint: "bg-primary-light text-primary" },
];

export default function QuickActions({
  onAction,
}: {
  onAction: (id: "give" | "receive" | "expense" | "sale") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {TILES.map((tile) => (
        <button
          key={tile.id}
          type="button"
          onClick={() => onAction(tile.id)}
          className="flex min-h-tap flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 py-5 text-center shadow-card transition active:scale-[0.97] active:bg-surface-alt"
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
