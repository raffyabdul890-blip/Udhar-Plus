"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon, { type IconName } from "@/components/icons/Icon";
import Amount from "@/components/ui/Amount";
import Button from "@/components/ui/Button";
import QuickActions from "@/components/dashboard/QuickActions";
import BalanceCardSkeleton from "@/components/skeletons/BalanceCardSkeleton";
import {
  getBankAccounts,
  getCashbookEntries,
  getCustomers,
  getRecentTransactions,
  type CashbookEntry,
  type LocalBankAccount,
  type LocalCustomer,
  type LocalTransaction,
} from "@/lib/db/offlineStorage";
import { isWithinRange, resolveDateRange } from "@/lib/utils/dateRange";
import type { BottomTabId } from "@/components/dashboard/BottomNav";

type ActivityRow = {
  id: string;
  date: string;
  icon: IconName;
  label: string;
  detail: string;
  amount: number;
  positive: boolean;
  tab: BottomTabId;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardHome({
  userId,
  shopLabel,
  onQuickAction,
  onNavigateToTab,
}: {
  userId: string;
  shopLabel: string;
  onQuickAction: (id: "give" | "receive" | "customer" | "expense" | "sale") => void;
  onNavigateToTab: (tab: BottomTabId) => void;
}) {
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<LocalBankAccount[]>([]);
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [cashbookEntries, setCashbookEntries] = useState<CashbookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    // Transactions are bounded to a rolling 60-day window — always a superset
    // of the current calendar month (at most 31 days) with room to spare for
    // "Recent Activity" to find its most-recent rows — instead of pulling a
    // shop's entire multi-year Khata history into memory just for this small
    // summary. Cashbook entries stay a full fetch: "Cash Available" is a
    // running sum of every entry ever recorded (see getCashbookEntries), so
    // bounding it would silently understate the real balance.
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sinceIso = sixtyDaysAgo.toISOString();

    const [customerRows, bankRows, transactionRows, cashbookRows] = await Promise.all([
      getCustomers(userId),
      getBankAccounts(userId),
      getRecentTransactions(userId, sinceIso),
      getCashbookEntries(userId),
    ]);
    setCustomers(customerRows);
    setBankAccounts(bankRows);
    setTransactions(transactionRows);
    setCashbookEntries(cashbookRows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Synchronizing with IndexedDB (an external store), not deriving state from props —
    // the textbook valid effect use case, just one the new lint rule can't tell apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const totalReceivable = customers.reduce((sum, c) => sum + Math.max(c.current_balance, 0), 0);
  const totalPayable = customers.reduce((sum, c) => sum + Math.max(-c.current_balance, 0), 0);
  const cashBalance = cashbookEntries
    .filter((e) => (e.payment_method ?? "cash") === "cash")
    .reduce((sum, e) => sum + (e.type === "IN" ? e.amount : -e.amount), 0);
  const bankWalletBalance = bankAccounts.reduce((sum, a) => sum + a.current_balance, 0);

  const monthRange = useMemo(() => resolveDateRange("month", { start: "", end: "" }), []);
  const NON_SALE_NOTES = new Set(["Opening balance", "Hisaab Baraber"]);
  const monthSales = transactions
    .filter(
      (t) =>
        t.entity_type === "customer" &&
        t.type === "OUT" &&
        !NON_SALE_NOTES.has(t.note ?? "") &&
        isWithinRange(t.transaction_date, monthRange)
    )
    .reduce((sum, t) => sum + t.amount, 0);
  const monthExpenses = cashbookEntries
    .filter((e) => e.is_expense && isWithinRange(e.entry_date, monthRange))
    .reduce((sum, e) => sum + e.amount, 0);

  const activity = useMemo<ActivityRow[]>(() => {
    const customerById = new Map(customers.map((c) => [c.id, c]));
    const accountById = new Map(bankAccounts.map((a) => [a.id, a]));
    const rows: ActivityRow[] = [];

    for (const t of transactions) {
      if (t.entity_type === "customer") {
        const customer = customerById.get(t.entity_id);
        rows.push({
          id: t.id,
          date: t.transaction_date,
          icon: t.type === "OUT" ? "khata" : "cash-in",
          label: t.type === "OUT" ? "Gave Udhaar" : "Received Payment",
          detail: customer?.name ?? "Customer",
          amount: t.amount,
          positive: t.type === "IN",
          tab: "khata",
        });
      } else if (t.entity_type === "bank") {
        // Skip legs already represented by their owning Khata/Cashbook record, and
        // one side of every transfer pair, so one real-world event = one row.
        if (t.link_kind === "customer_payment_leg" || t.link_kind === "expense_leg") continue;
        if (t.link_kind === "transfer_leg" && t.type === "IN") continue;
        const account = accountById.get(t.entity_id);
        rows.push({
          id: t.id,
          date: t.transaction_date,
          icon: t.link_kind === "transfer_leg" ? "transfer" : t.type === "IN" ? "cash-in" : "cash-out",
          label: t.link_kind === "transfer_leg" ? "Transfer" : t.type === "IN" ? "Added Money" : "Removed Money",
          detail: account?.account_title ?? "Account",
          amount: t.amount,
          positive: t.type === "IN",
          tab: "bank",
        });
      }
    }

    for (const e of cashbookEntries) {
      rows.push({
        id: e.id,
        date: e.entry_date,
        icon: e.is_expense ? "cash-out" : e.type === "IN" ? "cash-in" : "cash-out",
        label: e.is_expense ? "Expense" : e.type === "IN" ? "Cash In" : "Cash Out",
        detail: e.category,
        amount: e.amount,
        positive: e.type === "IN" && !e.is_expense,
        tab: "cashbook",
      });
    }

    return rows.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  }, [transactions, cashbookEntries, customers, bankAccounts]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <BalanceCardSkeleton />
        <BalanceCardSkeleton />
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex animate-fade-in-up flex-col gap-6">
      <p className="text-senior-sm text-ink-secondary">{today} · {shopLabel}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <p className="text-senior-xs font-medium text-ink-secondary">Total Receivable</p>
          <Amount value={totalReceivable} className="text-senior-xl font-bold text-danger" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <p className="text-senior-xs font-medium text-ink-secondary">Total Payable</p>
          <Amount value={totalPayable} className="text-senior-xl font-bold text-success-dark" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <p className="text-senior-xs font-medium text-ink-secondary">Cash Available</p>
          <Amount value={cashBalance} className="text-senior-xl font-bold text-ink" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <p className="text-senior-xs font-medium text-ink-secondary">Bank + Wallet</p>
          <Amount value={bankWalletBalance} className="text-senior-xl font-bold text-ink" />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-senior-base font-bold text-ink">Quick Actions</h2>
        <QuickActions onAction={onQuickAction} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-senior-base font-bold text-ink">Recent Activity</h2>
        </div>
        {activity.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-center text-senior-sm text-ink-secondary">
            No activity yet. Use Quick Actions above to get started.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onNavigateToTab(row.tab)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition active:scale-[0.99] active:bg-surface-alt"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      row.positive ? "bg-success-light text-success-dark" : "bg-danger-light text-danger-dark"
                    }`}
                  >
                    <Icon name={row.icon} size={17} />
                  </span>
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-senior-sm font-bold text-ink">{row.label}</span>
                    <span className="truncate text-senior-xs text-ink-secondary">
                      {row.detail} · {formatDateTime(row.date)}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 text-senior-sm font-bold ${row.positive ? "text-success-dark" : "text-danger"}`}
                  >
                    {row.positive ? "+" : "-"}
                    {row.amount.toLocaleString("en-PK")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
        <h2 className="text-senior-base font-bold text-ink">Business Summary — This Month</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-senior-xs text-ink-secondary">Sales</p>
            <Amount value={monthSales} className="text-senior-lg font-bold text-success-dark" />
          </div>
          <div>
            <p className="text-senior-xs text-ink-secondary">Expenses</p>
            <Amount value={monthExpenses} className="text-senior-lg font-bold text-danger" />
          </div>
        </div>
        <Button variant="ghost" size="sm" icon="arrow-right" onClick={() => onNavigateToTab("reports")}>
          View full report
        </Button>
      </section>
    </div>
  );
}
