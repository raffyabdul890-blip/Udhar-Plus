"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import AddItemModal from "@/components/items/AddItemModal";
import { deleteItem, getItems, type LocalItem } from "@/lib/db/offlineStorage";

type ModalState = { kind: "none" } | { kind: "add" } | { kind: "edit"; item: LocalItem };

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export default function ItemsTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<LocalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [pendingDelete, setPendingDelete] = useState<LocalItem | null>(null);

  const reload = useCallback(async () => {
    setItems(await getItems(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Synchronizing with IndexedDB (an external store), not deriving state from props —
    // the textbook valid effect use case, just one the new lint rule can't tell apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    await deleteItem(pendingDelete.id, userId);
    setPendingDelete(null);
    reload();
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <CustomerCardSkeletonList count={3} label="Loading items" />
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-6 text-center text-senior-base text-brand-white/80">
          No items yet. Add your first product to start tracking stock.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const threshold = item.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
            const lowStock = item.stock_quantity <= threshold;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setModal({ kind: "edit", item })}
                  className="flex min-h-tap w-full items-center gap-4 rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-4 text-left transition active:scale-[0.99]"
                >
                  <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                    <span className="truncate text-senior-base font-bold text-brand-white">
                      {item.name}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 truncate text-senior-sm text-brand-white/70">
                      Stock: {item.stock_quantity}
                      {lowStock && (
                        <span className="rounded-full bg-brand-red px-2 py-0.5 text-senior-xs font-bold text-brand-white">
                          Low stock
                        </span>
                      )}
                    </span>
                    {item.selling_price != null && (
                      <span className="truncate text-senior-xs text-brand-white/50">
                        Sells at {item.selling_price.toLocaleString("en-PK")}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setModal({ kind: "add" })}
        className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred"
      >
        + Add Item
      </button>

      {(modal.kind === "add" || modal.kind === "edit") && (
        <AddItemModal
          userId={userId}
          existing={modal.kind === "edit" ? modal.item : undefined}
          onClose={() => setModal({ kind: "none" })}
          onSaved={reload}
          onDelete={
            modal.kind === "edit"
              ? () => {
                  setPendingDelete(modal.item);
                  setModal({ kind: "none" });
                }
              : undefined
          }
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete item?"
          message={`This removes ${pendingDelete.name} from your inventory. This can't be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
