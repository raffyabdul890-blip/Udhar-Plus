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
import { usePreferences } from "@/components/providers/PreferencesProvider";

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
  const { t, language } = usePreferences();
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

    for (const txn of transactions) {
      if (txn.entity_type === "customer") {
        const customer = customerById.get(txn.entity_id);
        rows.push({
          id: txn.id,
          date: txn.transaction_date,
          icon: txn.type === "OUT" ? "khata" : "cash-in",
          label: txn.type === "OUT" ? t("dashboard.gaveUdhaar") : t("dashboard.receivedPayment"),
          detail: customer?.name ?? t("dashboard.customerFallback"),
          amount: txn.amount,
          positive: txn.type === "IN",
          tab: "khata",
        });
      } else if (txn.entity_type === "bank") {
        // Skip legs already represented by their owning Khata/Cashbook record, and
        // one side of every transfer pair, so one real-world event = one row.
        if (txn.link_kind === "customer_payment_leg" || txn.link_kind === "expense_leg") continue;
        if (txn.link_kind === "transfer_leg" && txn.type === "IN") continue;
        const account = accountById.get(txn.entity_id);
        rows.push({
          id: txn.id,
          date: txn.transaction_date,
          icon: txn.link_kind === "transfer_leg" ? "transfer" : txn.type === "IN" ? "cash-in" : "cash-out",
          label:
            txn.link_kind === "transfer_leg"
              ? t("dashboard.transfer")
              : txn.type === "IN"
                ? t("dashboard.addedMoney")
                : t("dashboard.removedMoney"),
          detail: account?.account_title ?? t("dashboard.accountFallback"),
          amount: txn.amount,
          positive: txn.type === "IN",
          tab: "bank",
        });
      }
    }

    for (const e of cashbookEntries) {
      rows.push({
        id: e.id,
        date: e.entry_date,
        icon: e.is_expense ? "cash-out" : e.type === "IN" ? "cash-in" : "cash-out",
        label: e.is_expense ? t("dashboard.expense") : e.type === "IN" ? t("dashboard.cashIn") : t("dashboard.cashOut"),
        detail: e.category,
        amount: e.amount,
        positive: e.type === "IN" && !e.is_expense,
        tab: "cashbook",
      });
    }

    return rows.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  }, [transactions, cashbookEntries, customers, bankAccounts, t]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <BalanceCardSkeleton />
        <BalanceCardSkeleton />
      </div>
    );
  }

  const today = new Date().toLocaleDateString(language === "ur" ? "ur-PK-u-nu-latn" : "en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex animate-fade-in-up flex-col gap-6">
      <p className="text-senior-sm text-ink-secondary">{today} · {shopLabel}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-danger/10 bg-danger-light p-4 shadow-card">
          <p className="text-senior-xs font-medium text-ink-secondary">{t("dashboard.totalReceivable")}</p>
          <Amount value={totalReceivable} className="text-senior-xl font-bold text-danger" />
        </div>
        <div className="rounded-2xl border border-success/10 bg-success-light p-4 shadow-card">
          <p className="text-senior-xs font-medium text-ink-secondary">{t("dashboard.totalPayable")}</p>
          <Amount value={totalPayable} className="text-senior-xl font-bold text-success-dark" />
        </div>
        <div className="rounded-2xl border border-primary/10 bg-primary-light p-4 shadow-card">
          <p className="text-senior-xs font-medium text-ink-secondary">{t("dashboard.cashAvailable")}</p>
          <Amount value={cashBalance} className="text-senior-xl font-bold text-primary" />
        </div>
        <div className="rounded-2xl border border-accent/10 bg-accent-light p-4 shadow-card">
          <p className="text-senior-xs font-medium text-ink-secondary">{t("dashboard.bankAndWallet")}</p>
          <Amount value={bankWalletBalance} className="text-senior-xl font-bold text-accent-dark" />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-senior-base font-bold text-ink">{t("dashboard.quickActions")}</h2>
        <QuickActions onAction={onQuickAction} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-senior-base font-bold text-ink">{t("dashboard.recentActivity")}</h2>
        </div>
        {activity.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-center text-senior-sm text-ink-secondary">
            {t("dashboard.noActivity")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onNavigateToTab(row.tab)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-start transition active:scale-[0.99] active:bg-surface-alt"
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
        <h2 className="text-senior-base font-bold text-ink">{t("dashboard.businessSummary")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-senior-xs text-ink-secondary">{t("dashboard.sales")}</p>
            <Amount value={monthSales} className="text-senior-lg font-bold text-success-dark" />
          </div>
          <div>
            <p className="text-senior-xs text-ink-secondary">{t("dashboard.expenses")}</p>
            <Amount value={monthExpenses} className="text-senior-lg font-bold text-danger" />
          </div>
        </div>
        <Button variant="ghost" size="sm" icon="arrow-right" onClick={() => onNavigateToTab("reports")}>
          {t("dashboard.viewFullReport")}
        </Button>
      </section>
    </div>
  );
}
