"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import SearchBar from "@/components/dashboard/SearchBar";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import AddItemModal from "@/components/items/AddItemModal";
import { deleteItem, getItems, type LocalItem } from "@/lib/db/offlineStorage";
import { usePreferences } from "@/components/providers/PreferencesProvider";

type ModalState = { kind: "none" } | { kind: "add" } | { kind: "edit"; item: LocalItem };

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export default function ItemsTab({ userId }: { userId: string }) {
  const { t } = usePreferences();
  const [items, setItems] = useState<LocalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [pendingDelete, setPendingDelete] = useState<LocalItem | null>(null);

  const query = search.trim().toLowerCase();
  const matchedItems = useMemo(
    () => (query ? items.filter((item) => item.name.toLowerCase().includes(query)) : items),
    [items, query]
  );

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
        <CustomerCardSkeletonList count={3} label={t("items.title")} />
      ) : items.length === 0 ? (
        <EmptyState icon="items" title={t("items.noItems")} description={t("items.noItemsDescription")} />
      ) : (
        <>
          <SearchBar value={search} onChange={setSearch} placeholder={t("items.searchPlaceholder")} />
          {matchedItems.length === 0 ? (
            <EmptyState icon="items" title={t("items.noItemsFound")} description={t("items.noItemsFoundDescription")} />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matchedItems.map((item) => {
                const threshold = item.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
                const lowStock = item.stock_quantity <= threshold;
                return (
                  <li key={item.id} className="[content-visibility:auto] [contain-intrinsic-size:auto_112px]">
                    <button
                      type="button"
                      onClick={() => setModal({ kind: "edit", item })}
                      className="flex min-h-tap w-full flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-start shadow-card transition active:scale-[0.99] active:bg-surface-alt"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-senior-base font-bold text-ink">{item.name}</span>
                        {lowStock && <Badge variant="warning">{t("items.lowStock")}</Badge>}
                      </div>
                      <span className="text-senior-sm text-ink-secondary">
                        {t("items.stock")}: {item.stock_quantity}
                      </span>
                      {item.selling_price != null && (
                        <span className="text-senior-xs text-ink-tertiary">
                          {t("items.sellsAt")} {item.selling_price.toLocaleString("en-PK")}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Button icon="plus" fullWidth onClick={() => setModal({ kind: "add" })}>
        {t("items.addItem")}
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
          title={t("items.deleteItemTitle")}
          message={t("items.deleteItemMessage", { name: pendingDelete.name })}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
