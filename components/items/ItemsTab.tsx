"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
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
        <EmptyState icon="items" title="No items yet" description="Add your first product to start tracking stock." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const threshold = item.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
            const lowStock = item.stock_quantity <= threshold;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setModal({ kind: "edit", item })}
                  className="flex min-h-tap w-full flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-left shadow-card transition active:scale-[0.99] active:bg-surface-alt"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-senior-base font-bold text-ink">{item.name}</span>
                    {lowStock && <Badge variant="warning">Low stock</Badge>}
                  </div>
                  <span className="text-senior-sm text-ink-secondary">Stock: {item.stock_quantity}</span>
                  {item.selling_price != null && (
                    <span className="text-senior-xs text-ink-tertiary">
                      Sells at {item.selling_price.toLocaleString("en-PK")}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Button icon="plus" fullWidth onClick={() => setModal({ kind: "add" })}>
        Add Item
      </Button>

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
