import type { LineItem } from "@/lib/db/offlineStorage";

export function emptyLineItem(): LineItem {
  return { id: crypto.randomUUID(), name: "", quantity: 0, unit: "", pricePerUnit: 0 };
}

export function computeItemsTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);
}

export default function ItemizedEntryFields({
  items,
  onChange,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  function updateItem(id: string, patch: Partial<LineItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-2 rounded-xl border border-brand-charcoal p-3"
        >
          <div className="flex items-center gap-2">
            <input
              value={item.name}
              onChange={(e) => updateItem(item.id, { name: e.target.value })}
              placeholder="Item name, e.g. Rice"
              aria-label="Item name"
              className="min-h-tap min-w-0 flex-1 rounded-lg border border-brand-charcoal bg-transparent px-3 text-senior-sm text-brand-white placeholder:text-brand-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
            />
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              aria-label="Remove item"
              className="flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-lg text-senior-base text-brand-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
            >
              🗑️
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={item.quantity || ""}
              onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 0 })}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="Qty"
              aria-label="Quantity"
              className="min-h-tap w-0 flex-1 rounded-lg border border-brand-charcoal bg-transparent px-2 text-senior-sm text-brand-white placeholder:text-brand-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
            />
            <input
              value={item.unit ?? ""}
              onChange={(e) => updateItem(item.id, { unit: e.target.value })}
              placeholder="Unit, e.g. kg"
              aria-label="Unit"
              className="min-h-tap w-0 flex-1 rounded-lg border border-brand-charcoal bg-transparent px-2 text-senior-sm text-brand-white placeholder:text-brand-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
            />
            <input
              value={item.pricePerUnit || ""}
              onChange={(e) =>
                updateItem(item.id, { pricePerUnit: Number(e.target.value) || 0 })
              }
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="Price/unit"
              aria-label="Price per unit"
              className="min-h-tap w-0 flex-1 rounded-lg border border-brand-charcoal bg-transparent px-2 text-senior-sm text-brand-white placeholder:text-brand-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
            />
          </div>
          {item.quantity > 0 && item.pricePerUnit > 0 && (
            <p className="text-senior-xs text-brand-white/60">
              Line total: {(item.quantity * item.pricePerUnit).toLocaleString("en-PK")}
            </p>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...items, emptyLineItem()])}
        className="min-h-tap rounded-xl border border-brand-charcoal px-4 text-senior-sm font-bold text-brand-white transition active:scale-[0.98]"
      >
        + Add item
      </button>
    </div>
  );
}
