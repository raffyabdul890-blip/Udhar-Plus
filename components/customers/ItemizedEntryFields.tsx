import Icon from "@/components/icons/Icon";
import Button from "@/components/ui/Button";
import { selectClassName } from "@/components/ui/TextField";
import type { LineItem, LocalItem } from "@/lib/db/offlineStorage";

export function emptyLineItem(): LineItem {
  return { id: crypto.randomUUID(), name: "", quantity: 0, unit: "", pricePerUnit: 0 };
}

export function computeItemsTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);
}

const fieldClassName =
  "min-h-tap min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-senior-sm text-ink placeholder:text-ink-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function ItemizedEntryFields({
  items,
  catalogItems,
  onChange,
}: {
  items: LineItem[];
  /** Items/Inventory catalog for this shop — lets a row auto-fill name + selling price instead of retyping them. */
  catalogItems: LocalItem[];
  onChange: (items: LineItem[]) => void;
}) {
  function updateItem(id: string, patch: Partial<LineItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  function handleCatalogSelect(id: string, catalogId: string) {
    if (!catalogId) {
      updateItem(id, { itemId: undefined });
      return;
    }
    const catalogItem = catalogItems.find((c) => c.id === catalogId);
    if (!catalogItem) return;
    const current = items.find((item) => item.id === id);
    updateItem(id, {
      itemId: catalogItem.id,
      name: catalogItem.name,
      pricePerUnit: catalogItem.selling_price ?? 0,
      quantity: current?.quantity || 1,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const catalogItem = item.itemId ? catalogItems.find((c) => c.id === item.itemId) : undefined;
        const overStock = Boolean(catalogItem && item.quantity > catalogItem.stock_quantity);
        const lineTotal = item.quantity * item.pricePerUnit;

        return (
          <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center gap-2">
              {catalogItems.length > 0 ? (
                <select
                  value={item.itemId ?? ""}
                  onChange={(e) => handleCatalogSelect(item.id, e.target.value)}
                  aria-label="Choose item from catalog"
                  className={`${selectClassName} min-w-0 flex-1 text-senior-sm`}
                >
                  <option value="">— Type item manually —</option>
                  {catalogItems.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.selling_price != null ? ` (Rs. ${c.selling_price})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  placeholder="Item name, e.g. Rice"
                  aria-label="Item name"
                  className={fieldClassName}
                />
              )}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label="Remove item"
                className="flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-lg text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Icon name="trash" size={18} />
              </button>
            </div>

            {catalogItems.length > 0 && !item.itemId && (
              <input
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                placeholder="Item name, e.g. Rice"
                aria-label="Item name"
                className={`${fieldClassName} flex-none`}
              />
            )}

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
                className={`${fieldClassName} w-0 px-2`}
              />
              <input
                value={item.unit ?? ""}
                onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                placeholder="Unit, e.g. kg"
                aria-label="Unit"
                className={`${fieldClassName} w-0 px-2`}
              />
              <input
                value={item.pricePerUnit || ""}
                onChange={(e) => updateItem(item.id, { pricePerUnit: Number(e.target.value) || 0 })}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="Price/unit"
                aria-label="Price per unit"
                className={`${fieldClassName} w-0 px-2`}
              />
            </div>

            {lineTotal > 0 && (
              <p className="text-senior-xs font-medium text-ink-secondary">
                Line total: {lineTotal.toLocaleString("en-PK")}
              </p>
            )}
            {overStock && catalogItem && (
              <p className="text-senior-xs font-medium text-danger">
                Only {catalogItem.stock_quantity} in stock — saving will take stock negative.
              </p>
            )}
          </div>
        );
      })}

      <Button variant="secondary" size="sm" icon="plus" onClick={() => onChange([...items, emptyLineItem()])}>
        Add Item
      </Button>
    </div>
  );
}
