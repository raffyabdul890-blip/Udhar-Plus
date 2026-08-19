"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import AddCashbookEntryModal from "@/components/cashbook/AddCashbookEntryModal";
import EntryPhotoThumbnail from "@/components/customers/EntryPhotoThumbnail";
import { deleteCashbookEntryWithLink } from "@/lib/db/ledger";
import { getCashbookEntries, type CashbookEntry } from "@/lib/db/offlineStorage";
import {
  isBeforeRange,
  isWithinRange,
  resolveDateRange,
  type DateRangePreset,
} from "@/lib/utils/dateRange";

type ViewMode = "cashbook" | "expenses";
type ModalState =
  | { kind: "none" }
  | { kind: "add"; expenseMode: boolean; initialType: "IN" | "OUT" }
  | { kind: "edit"; entry: CashbookEntry };

function isCashEntry(entry: CashbookEntry): boolean {
  return (entry.payment_method ?? "cash") === "cash";
}

function compareEntryDates(a: CashbookEntry, b: CashbookEntry): number {
  if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? -1 : 1;
  return a.created_at < b.created_at ? -1 : 1;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CashbookTab({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("cashbook");
  const [datePreset, setDatePreset] = useState<DateRangePreset>("today");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [pendingDelete, setPendingDelete] = useState<CashbookEntry | null>(null);

  const reload = useCallback(async () => {
    setEntries(await getCashbookEntries(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Synchronizing with IndexedDB (an external store), not deriving state from props —
    // the textbook valid effect use case, just one the new lint rule can't tell apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const range = useMemo(() => resolveDateRange(datePreset, customRange), [datePreset, customRange]);

  function handleDateChange(preset: DateRangePreset, next: { start: string; end: string }) {
    setDatePreset(preset);
    setCustomRange(next);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    await deleteCashbookEntryWithLink(pendingDelete);
    setPendingDelete(null);
    reload();
  }

  // ---- Cashbook view: cash-only entries, opening/in/out/current balance ----
  const cashEntries = useMemo(() => entries.filter(isCashEntry), [entries]);
  const openingBalance = useMemo(
    () =>
      cashEntries
        .filter((e) => isBeforeRange(e.entry_date, range))
        .reduce((sum, e) => sum + (e.type === "IN" ? e.amount : -e.amount), 0),
    [cashEntries, range]
  );
  const cashInRange = useMemo(
    () => cashEntries.filter((e) => isWithinRange(e.entry_date, range)).sort(compareEntryDates),
    [cashEntries, range]
  );
  const cashInTotal = cashInRange.filter((e) => e.type === "IN").reduce((s, e) => s + e.amount, 0);
  const cashOutTotal = cashInRange.filter((e) => e.type === "OUT").reduce((s, e) => s + e.amount, 0);
  const currentBalance = openingBalance + cashInTotal - cashOutTotal;

  // Running balance per row, computed forward then reversed for newest-first display.
  const cashHistory = useMemo(() => {
    const withBalance = cashInRange.reduce<{ entry: CashbookEntry; balance: number }[]>(
      (acc, entry) => {
        const previousBalance = acc.length > 0 ? acc[acc.length - 1].balance : openingBalance;
        const balance = previousBalance + (entry.type === "IN" ? entry.amount : -entry.amount);
        return [...acc, { entry, balance }];
      },
      []
    );
    return withBalance.reverse();
  }, [cashInRange, openingBalance]);

  // ---- Expenses view: all is_expense entries regardless of payment method ----
  const expenseEntries = useMemo(() => entries.filter((e) => e.is_expense), [entries]);
  const expensesInRange = useMemo(
    () => expenseEntries.filter((e) => isWithinRange(e.entry_date, range)).sort((a, b) => compareEntryDates(b, a)),
    [expenseEntries, range]
  );
  const expensesTotal = expensesInRange.reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return <CustomerCardSkeletonList count={3} label="Loading cashbook" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label="View"
        value={view}
        onChange={setView}
        options={[
          { value: "cashbook", label: "Cashbook" },
          { value: "expenses", label: "Expenses" },
        ]}
      />

      <DateRangeFilter
        presets={["today", "yesterday", "week", "month", "custom"]}
        value={datePreset}
        customRange={customRange}
        onChange={handleDateChange}
      />

      {view === "cashbook" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-brand-charcoal/40 p-4">
              <p className="text-senior-xs text-brand-white/60">Opening Balance</p>
              <p className="text-senior-lg font-bold text-brand-white">
                {openingBalance.toLocaleString("en-PK")}
              </p>
            </div>
            <div className="rounded-xl bg-brand-charcoal/40 p-4">
              <p className="text-senior-xs text-brand-white/60">Current Balance</p>
              <p className="text-senior-lg font-bold text-brand-white">
                {currentBalance.toLocaleString("en-PK")}
              </p>
            </div>
            <div className="rounded-xl bg-brand-charcoal/40 p-4">
              <p className="text-senior-xs text-brand-white/60">Cash In</p>
              <p className="text-senior-lg font-bold text-brand-green">
                +{cashInTotal.toLocaleString("en-PK")}
              </p>
            </div>
            <div className="rounded-xl bg-brand-charcoal/40 p-4">
              <p className="text-senior-xs text-brand-white/60">Cash Out</p>
              <p className="text-senior-lg font-bold text-brand-red">
                -{cashOutTotal.toLocaleString("en-PK")}
              </p>
            </div>
          </div>

          {cashHistory.length === 0 ? (
            <p className="rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-6 text-center text-senior-base text-brand-white/80">
              No cash entries {datePreset === "today" ? "today" : "in this range"}. Add your first
              Cash In or Cash Out.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cashHistory.map(({ entry, balance }) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setModal({ kind: "edit", entry })}
                    className="flex w-full items-center gap-3 rounded-xl bg-brand-charcoal/40 px-3 py-2 text-left transition active:scale-[0.99]"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-senior-sm font-bold ${
                        entry.type === "IN" ? "bg-brand-green/20 text-brand-green" : "bg-brand-red/20 text-brand-red"
                      }`}
                    >
                      {entry.type === "IN" ? "+" : "−"}
                    </span>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-senior-sm font-bold text-brand-white">
                        {entry.category}
                        {entry.is_expense ? " (Expense)" : ""}
                      </span>
                      <span className="truncate text-senior-xs text-brand-white/60">
                        {formatDateTime(entry.entry_date)}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span
                        className={`text-senior-sm font-bold ${
                          entry.type === "IN" ? "text-brand-green" : "text-brand-red"
                        }`}
                      >
                        {entry.type === "IN" ? "+" : "-"}
                        {entry.amount.toLocaleString("en-PK")}
                      </span>
                      <span className="text-senior-xs text-brand-white/50">
                        Bal. {balance.toLocaleString("en-PK")}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModal({ kind: "add", expenseMode: false, initialType: "IN" })}
              className="min-h-tap flex-1 rounded-xl bg-brand-green px-4 text-senior-base font-bold text-brand-black transition active:scale-[0.98]"
            >
              + Cash In
            </button>
            <button
              type="button"
              onClick={() => setModal({ kind: "add", expenseMode: false, initialType: "OUT" })}
              className="min-h-tap flex-1 rounded-xl bg-brand-red px-4 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred"
            >
              + Cash Out
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl bg-brand-charcoal/40 p-4">
            <p className="text-senior-xs text-brand-white/60">
              Total Expenses {datePreset === "today" ? "Today" : ""}
            </p>
            <p className="text-senior-lg font-bold text-brand-red">
              {expensesTotal.toLocaleString("en-PK")}
            </p>
            <p className="text-senior-xs text-brand-white/50">
              {expensesInRange.length} expense{expensesInRange.length === 1 ? "" : "s"}
            </p>
          </div>

          {expensesInRange.length === 0 ? (
            <p className="rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-6 text-center text-senior-base text-brand-white/80">
              No expenses yet. Add an expense to start tracking your spending.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {expensesInRange.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setModal({ kind: "edit", entry })}
                    className="flex w-full items-center gap-3 rounded-xl bg-brand-charcoal/40 px-3 py-2 text-left transition active:scale-[0.99]"
                  >
                    {entry.photo_id && <EntryPhotoThumbnail photoId={entry.photo_id} />}
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-senior-sm font-bold text-brand-white">
                        {entry.category}
                      </span>
                      <span className="truncate text-senior-xs text-brand-white/60">
                        {formatDateTime(entry.entry_date)} ·{" "}
                        {(entry.payment_method ?? "cash").toUpperCase()}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </span>
                    </div>
                    <span className="shrink-0 text-senior-sm font-bold text-brand-red">
                      -{entry.amount.toLocaleString("en-PK")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setModal({ kind: "add", expenseMode: true, initialType: "OUT" })}
            className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred"
          >
            + Add Expense
          </button>
        </>
      )}

      {modal.kind === "add" && (
        <AddCashbookEntryModal
          userId={userId}
          mode={modal.expenseMode ? "expense" : "cash"}
          initialType={modal.initialType}
          onClose={() => setModal({ kind: "none" })}
          onSaved={reload}
        />
      )}
      {modal.kind === "edit" && (
        <AddCashbookEntryModal
          userId={userId}
          mode={modal.entry.is_expense ? "expense" : "cash"}
          existing={modal.entry}
          onClose={() => setModal({ kind: "none" })}
          onSaved={reload}
          onDelete={() => {
            setPendingDelete(modal.entry);
            setModal({ kind: "none" });
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete entry?"
          message="This removes the entry and adjusts your totals. This can't be undone."
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
