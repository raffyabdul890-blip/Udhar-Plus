"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Button from "@/components/ui/Button";
import Amount from "@/components/ui/Amount";
import Icon from "@/components/icons/Icon";
import EmptyState from "@/components/ui/EmptyState";
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

export default function CashbookTab({
  userId,
  pendingExpense,
  onPendingActionHandled,
}: {
  userId: string;
  /** Set by the Dashboard "+ Expense" quick action. */
  pendingExpense?: boolean;
  onPendingActionHandled?: () => void;
}) {
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

  useEffect(() => {
    if (pendingExpense && modal.kind === "none") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView("expenses");
      setModal({ kind: "add", expenseMode: true, initialType: "OUT" });
    }
  }, [pendingExpense, modal.kind]);

  function closeModal() {
    setModal({ kind: "none" });
    onPendingActionHandled?.();
  }

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
  const expensesByCategory = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const e of expensesInRange) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    return [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  }, [expensesInRange]);

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
          <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
            <p className="text-senior-sm font-medium text-ink-secondary">Current Cash</p>
            <Amount value={currentBalance} className="text-senior-3xl font-bold text-ink" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-senior-xs text-ink-secondary">Opening Balance</p>
              <Amount value={openingBalance} className="text-senior-lg font-bold text-ink" />
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-senior-xs text-ink-secondary">Today&rsquo;s Cash In</p>
              <Amount value={cashInTotal} prefix="+" className="text-senior-lg font-bold text-success-dark" />
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-senior-xs text-ink-secondary">Today&rsquo;s Cash Out</p>
              <Amount value={cashOutTotal} prefix="-" className="text-senior-lg font-bold text-danger" />
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-senior-xs text-ink-secondary">Entries</p>
              <p className="text-senior-lg font-bold text-ink">{cashInRange.length}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="success"
              icon="cash-in"
              fullWidth
              onClick={() => setModal({ kind: "add", expenseMode: false, initialType: "IN" })}
            >
              Cash In
            </Button>
            <Button
              variant="warning"
              icon="cash-out"
              fullWidth
              onClick={() => setModal({ kind: "add", expenseMode: false, initialType: "OUT" })}
            >
              Cash Out
            </Button>
          </div>

          {cashHistory.length === 0 ? (
            <EmptyState
              icon="cashbook"
              title="No cash entries"
              description={`No entries ${datePreset === "today" ? "today" : "in this range"} yet.`}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {cashHistory.map(({ entry, balance }) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setModal({ kind: "edit", entry })}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition active:scale-[0.99] active:bg-surface-alt"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        entry.type === "IN" ? "bg-success-light text-success-dark" : "bg-danger-light text-danger-dark"
                      }`}
                    >
                      <Icon name={entry.type === "IN" ? "cash-in" : "cash-out"} size={17} />
                    </span>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-senior-sm font-bold text-ink">
                        {entry.category}
                        {entry.is_expense ? " (Expense)" : ""}
                      </span>
                      <span className="truncate text-senior-xs text-ink-secondary">
                        {formatDateTime(entry.entry_date)}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span
                        className={`text-senior-sm font-bold ${
                          entry.type === "IN" ? "text-success-dark" : "text-danger"
                        }`}
                      >
                        {entry.type === "IN" ? "+" : "-"}
                        {entry.amount.toLocaleString("en-PK")}
                      </span>
                      <span className="text-senior-xs text-ink-tertiary">
                        Bal. {balance.toLocaleString("en-PK")}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
            <p className="text-senior-sm font-medium text-ink-secondary">
              Total Expenses {datePreset === "today" ? "Today" : ""}
            </p>
            <Amount value={expensesTotal} className="text-senior-3xl font-bold text-danger" />
            <p className="text-senior-xs text-ink-tertiary">
              {expensesInRange.length} expense{expensesInRange.length === 1 ? "" : "s"}
            </p>
          </div>

          {expensesByCategory.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
              {expensesByCategory.map(([category, total]) => {
                const pct = Math.max(2, Math.round((total / expensesTotal) * 100));
                return (
                  <div key={category} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-senior-sm">
                      <span className="truncate font-medium text-ink">{category}</span>
                      <span className="shrink-0 font-bold text-ink">{total.toLocaleString("en-PK")}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-alt">
                      <div className="h-full rounded-full bg-danger" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            variant="warning"
            icon="plus"
            fullWidth
            onClick={() => setModal({ kind: "add", expenseMode: true, initialType: "OUT" })}
          >
            Add Expense
          </Button>

          {expensesInRange.length === 0 ? (
            <EmptyState icon="cash-out" title="No expenses yet" description="Add an expense to start tracking your spending." />
          ) : (
            <ul className="flex flex-col gap-2">
              {expensesInRange.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setModal({ kind: "edit", entry })}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition active:scale-[0.99] active:bg-surface-alt"
                  >
                    {entry.photo_id ? (
                      <EntryPhotoThumbnail photoId={entry.photo_id} />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-light text-danger-dark">
                        <Icon name="cash-out" size={16} />
                      </span>
                    )}
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-senior-sm font-bold text-ink">{entry.category}</span>
                      <span className="truncate text-senior-xs text-ink-secondary">
                        {formatDateTime(entry.entry_date)} · {(entry.payment_method ?? "cash").toUpperCase()}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </span>
                    </div>
                    <span className="shrink-0 text-senior-sm font-bold text-danger">
                      -{entry.amount.toLocaleString("en-PK")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {modal.kind === "add" && (
        <AddCashbookEntryModal
          userId={userId}
          mode={modal.expenseMode ? "expense" : "cash"}
          initialType={modal.initialType}
          onClose={closeModal}
          onSaved={reload}
        />
      )}
      {modal.kind === "edit" && (
        <AddCashbookEntryModal
          userId={userId}
          mode={modal.entry.is_expense ? "expense" : "cash"}
          existing={modal.entry}
          onClose={closeModal}
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
