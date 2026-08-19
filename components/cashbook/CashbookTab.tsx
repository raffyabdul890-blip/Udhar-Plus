"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import AddCashbookEntryModal from "@/components/cashbook/AddCashbookEntryModal";
import {
  deleteCashbookEntry,
  getCashbookEntries,
  type CashbookEntry,
} from "@/lib/db/offlineStorage";

function compareCashbookDates(a: CashbookEntry, b: CashbookEntry): number {
  if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? 1 : -1;
  return a.created_at < b.created_at ? 1 : -1;
}

export default function CashbookTab({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CashbookEntry | null>(null);

  const reload = useCallback(async () => {
    const rows = await getCashbookEntries(userId);
    setEntries(rows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Synchronizing with IndexedDB (an external store), not deriving state from props —
    // the textbook valid effect use case, just one the new lint rule can't tell apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const todayKey = new Date().toDateString();
  const todayEntries = entries.filter((e) => new Date(e.entry_date).toDateString() === todayKey);
  const todayIn = todayEntries.filter((e) => e.type === "IN").reduce((s, e) => s + e.amount, 0);
  const todayOut = todayEntries.filter((e) => e.type === "OUT").reduce((s, e) => s + e.amount, 0);

  const sorted = [...entries].sort(compareCashbookDates);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    await deleteCashbookEntry(pendingDelete.id, userId);
    setPendingDelete(null);
    reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-brand-charcoal/40 p-4">
        <p className="text-senior-sm font-bold text-brand-white">Today</p>
        <div className="mt-2 flex gap-4">
          <div>
            <p className="text-senior-xs text-brand-white/60">Cash IN</p>
            <p className="text-senior-lg font-bold text-brand-green">
              {todayIn.toLocaleString("en-PK")}
            </p>
          </div>
          <div>
            <p className="text-senior-xs text-brand-white/60">Cash OUT</p>
            <p className="text-senior-lg font-bold text-brand-red">
              {todayOut.toLocaleString("en-PK")}
            </p>
          </div>
          <div>
            <p className="text-senior-xs text-brand-white/60">Net</p>
            <p className="text-senior-lg font-bold text-brand-white">
              {(todayIn - todayOut).toLocaleString("en-PK")}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <CustomerCardSkeletonList count={3} label="Loading cashbook" />
      ) : entries.length === 0 ? (
        <p className="rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-6 text-center text-senior-base text-brand-white/80">
          No cashbook entries yet. Add your first cash sale or expense.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 rounded-xl bg-brand-charcoal/40 px-3 py-2"
            >
              <div className="flex flex-1 flex-col overflow-hidden">
                <span
                  className={`truncate text-senior-sm font-bold ${
                    entry.type === "IN" ? "text-brand-green" : "text-brand-red"
                  }`}
                >
                  {entry.type === "IN" ? "Cash IN" : "Cash OUT"} ·{" "}
                  {entry.amount.toLocaleString("en-PK")}
                </span>
                <span className="truncate text-senior-xs text-brand-white/60">
                  {new Date(entry.entry_date).toLocaleDateString("en-PK", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {entry.category}
                  {entry.note ? ` · ${entry.note}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(entry)}
                aria-label="Delete entry"
                className="flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-xl text-senior-base text-brand-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred"
      >
        + Add Cash Entry
      </button>

      {showAdd && (
        <AddCashbookEntryModal
          userId={userId}
          onClose={() => setShowAdd(false)}
          onAdded={reload}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete entry?"
          message="This removes the cashbook entry. This can't be undone."
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
