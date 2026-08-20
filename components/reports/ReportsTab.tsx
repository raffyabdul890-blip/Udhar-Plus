"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import SimpleBarChart from "@/components/reports/SimpleBarChart";
import Amount from "@/components/ui/Amount";
import Badge from "@/components/ui/Badge";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import CustomerTransactionModal from "@/components/customers/CustomerTransactionModal";
import BankTransactionModal from "@/components/bank/BankTransactionModal";
import BankLogoBadge from "@/components/bank/BankLogoBadge";
import { getFinancialInstitution } from "@/lib/constants/banks";
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
import { isWithinRange, resolveDateRange, type DateRangePreset } from "@/lib/utils/dateRange";
import { usePreferences } from "@/components/providers/PreferencesProvider";

// Entries with these notes aren't real sales — an opening balance is a
// starting position, and "Hisaab Baraber" is a balance-clearing adjustment,
// not goods changing hands. See lib/db/ledger.ts / AddCustomerModal.
const NON_SALE_NOTES = new Set(["Opening balance", "Hisaab Baraber"]);

function isSaleTransaction(t: LocalTransaction): boolean {
  return t.entity_type === "customer" && t.type === "OUT" && !NON_SALE_NOTES.has(t.note ?? "");
}

function isCashEntry(entry: CashbookEntry): boolean {
  return (entry.payment_method ?? "cash") === "cash";
}

function StatCard({
  label,
  value,
  tone = "ink",
  hint,
}: {
  label: string;
  value: number;
  tone?: "ink" | "danger" | "success" | "primary";
  hint?: string;
}) {
  const toneClass = {
    ink: "text-ink",
    danger: "text-danger",
    success: "text-success-dark",
    primary: "text-primary",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-senior-xs text-ink-secondary">{label}</p>
      <Amount value={value} className={`text-senior-lg font-bold ${toneClass}`} />
      {hint && <p className="text-senior-xs text-ink-tertiary">{hint}</p>}
    </div>
  );
}

export default function ReportsTab({ userId, shopLabel }: { userId: string; shopLabel: string }) {
  const { t } = usePreferences();
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [cashbookEntries, setCashbookEntries] = useState<CashbookEntry[]>([]);
  const [bankAccounts, setBankAccounts] = useState<LocalBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("today");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [openAccountId, setOpenAccountId] = useState<string | null>(null);

  const range = useMemo(() => resolveDateRange(datePreset, customRange), [datePreset, customRange]);

  // Transactions are bounded to the selected range's start via the same
  // indexed query Dashboard/Sales use, instead of pulling a shop's entire
  // Khata history just to filter it down client-side for the Sales &
  // Expenses section — re-fetches whenever the date filter changes, so
  // "custom" ranges reaching further back still load correctly. Cashbook
  // entries and customers stay full fetches: Receivable/Payable/Cash/Liquid
  // Balance are always-current figures (not range-filtered), and Cashbook
  // has no denormalized running balance to query against directly (see
  // DashboardHome's identical reasoning).
  const reload = useCallback(async () => {
    const [customerRows, transactionRows, cashbookRows, bankRows] = await Promise.all([
      getCustomers(userId),
      getRecentTransactions(userId, range.start.toISOString()),
      getCashbookEntries(userId),
      getBankAccounts(userId),
    ]);
    setCustomers(customerRows);
    setTransactions(transactionRows);
    setCashbookEntries(cashbookRows);
    setBankAccounts(bankRows);
    setLoading(false);
  }, [userId, range]);

  useEffect(() => {
    // Synchronizing with IndexedDB (an external store), not deriving state from props —
    // the textbook valid effect use case, just one the new lint rule can't tell apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  // ---- Money (always-current, like Receivable/Payable — not range-filtered) ----
  const totalReceivable = customers.reduce((sum, c) => sum + Math.max(c.current_balance, 0), 0);
  const totalPayable = customers.reduce((sum, c) => sum + Math.max(-c.current_balance, 0), 0);
  const cashBalance = cashbookEntries
    .filter(isCashEntry)
    .reduce((sum, e) => sum + (e.type === "IN" ? e.amount : -e.amount), 0);
  const totalBankBalance = bankAccounts
    .filter((a) => getFinancialInstitution(a.bank_code)?.category === "bank")
    .reduce((sum, a) => sum + a.current_balance, 0);
  const totalWalletBalance = bankAccounts
    .filter((a) => getFinancialInstitution(a.bank_code)?.category === "wallet")
    .reduce((sum, a) => sum + a.current_balance, 0);
  // Liquid = money the shop can actually spend right now — cash + bank + wallet.
  // Receivable is what customers owe, not liquid cash, so it's kept separate.
  const liquidBalance = cashBalance + totalBankBalance + totalWalletBalance;

  // ---- Sales (selected range) ----
  const salesInRange = useMemo(
    () => transactions.filter((t) => isSaleTransaction(t) && isWithinRange(t.transaction_date, range)),
    [transactions, range]
  );
  const totalSales = salesInRange.reduce((s, t) => s + t.amount, 0);
  const salesCount = salesInRange.length;
  const avgSale = salesCount > 0 ? totalSales / salesCount : 0;

  const topItems = useMemo(() => {
    const byItem = new Map<string, { name: string; quantity: number; total: number }>();
    for (const txn of salesInRange) {
      for (const item of txn.items ?? []) {
        const key = item.itemId ?? item.name;
        const existing = byItem.get(key) ?? { name: item.name || t("transaction.item"), quantity: 0, total: 0 };
        existing.quantity += item.quantity;
        existing.total += item.quantity * item.pricePerUnit;
        byItem.set(key, existing);
      }
    }
    return [...byItem.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [salesInRange, t]);

  // ---- Expenses (selected range) ----
  const expensesInRange = useMemo(
    () => cashbookEntries.filter((e) => e.is_expense && isWithinRange(e.entry_date, range)),
    [cashbookEntries, range]
  );
  const totalExpenses = expensesInRange.reduce((s, e) => s + e.amount, 0);
  const expensesByCategory = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const e of expensesInRange) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    }
    return [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  }, [expensesInRange]);

  // ---- Cash Flow (selected range, cash-method entries only) ----
  const cashFlowInRange = useMemo(
    () => cashbookEntries.filter((e) => isCashEntry(e) && isWithinRange(e.entry_date, range)),
    [cashbookEntries, range]
  );
  const moneyIn = cashFlowInRange.filter((e) => e.type === "IN").reduce((s, e) => s + e.amount, 0);
  const moneyOut = cashFlowInRange.filter((e) => e.type === "OUT").reduce((s, e) => s + e.amount, 0);
  const netCashFlow = moneyIn - moneyOut;

  // ---- Customers ----
  const topCustomers = [...customers]
    .filter((c) => c.current_balance !== 0)
    .sort((a, b) => Math.abs(b.current_balance) - Math.abs(a.current_balance))
    .slice(0, 10);

  const openCustomer = openCustomerId ? customers.find((c) => c.id === openCustomerId) : undefined;
  const openAccount = openAccountId ? bankAccounts.find((a) => a.id === openAccountId) : undefined;

  if (loading) {
    return <CustomerCardSkeletonList count={3} label={t("reports.title")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <DateRangeFilter
        presets={["today", "week", "month", "custom"]}
        value={datePreset}
        customRange={customRange}
        onChange={(preset, next) => {
          setDatePreset(preset);
          setCustomRange(next);
        }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-senior-base font-bold text-ink">{t("reports.businessOverview")}</h2>
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            <StatCard label={t("reports.receivable")} value={totalReceivable} tone="danger" />
            <StatCard label={t("reports.payable")} value={totalPayable} tone="success" />
            <StatCard label={t("reports.cashBalance")} value={cashBalance} />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-senior-base font-bold text-ink">{t("reports.bankAndWallet")}</h2>
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            <StatCard label={t("reports.totalBank")} value={totalBankBalance} />
            <StatCard label={t("reports.totalWallet")} value={totalWalletBalance} />
            <StatCard label={t("reports.liquidBalance")} value={liquidBalance} tone="success" hint={t("reports.liquidBalanceHint")} />
          </div>
          {bankAccounts.length > 0 && (
            <ul className="flex flex-col gap-2">
              {bankAccounts.map((account) => (
                <li key={account.id}>
                  <button
                    type="button"
                    onClick={() => setOpenAccountId(account.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-start transition active:scale-[0.99] active:bg-surface-alt"
                  >
                    <BankLogoBadge bankCode={account.bank_code} size="sm" />
                    <span className="flex-1 truncate text-senior-sm font-medium text-ink">
                      {account.account_title}
                    </span>
                    <span className="shrink-0 text-senior-sm font-bold text-ink">
                      {account.current_balance.toLocaleString("en-PK")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-senior-base font-bold text-ink">
            {t("reports.salesAndExpenses")} {datePreset === "custom" ? t("reports.selectedRange") : ""}
          </h2>
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            <StatCard
              label={t("sales.salesLabel")}
              value={totalSales}
              tone="success"
              hint={t(salesCount === 1 ? "sales.salesCount" : "sales.salesCountPlural", { count: salesCount })}
            />
            <StatCard
              label={t("reports.expenses")}
              value={totalExpenses}
              tone="danger"
              hint={t(expensesInRange.length === 1 ? "cashbook.expensesCount" : "cashbook.expensesCountPlural", {
                count: expensesInRange.length,
              })}
            />
            <StatCard label={t("reports.netCashFlow")} value={netCashFlow} tone={netCashFlow >= 0 ? "success" : "danger"} />
          </div>
          {salesCount > 0 && (
            <p className="text-senior-xs text-ink-tertiary">
              {t("reports.averageSale", { amount: avgSale.toLocaleString("en-PK", { maximumFractionDigits: 0 }) })}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-senior-base font-bold text-ink">{t("reports.cashFlow")}</h2>
          <div className="rounded-xl border border-border bg-surface p-4">
            <SimpleBarChart
              bars={[
                { label: t("reports.moneyIn"), value: moneyIn, colorClassName: "bg-success" },
                { label: t("reports.moneyOut"), value: moneyOut, colorClassName: "bg-danger" },
              ]}
            />
          </div>
        </section>

        {expensesByCategory.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-senior-base font-bold text-ink">{t("reports.expensesByCategory")}</h2>
            <div className="rounded-xl border border-border bg-surface p-4">
              <SimpleBarChart
                bars={expensesByCategory.map(([category, total]) => ({
                  label: category,
                  value: total,
                  colorClassName: "bg-danger",
                }))}
              />
            </div>
          </section>
        )}

        {topItems.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-senior-base font-bold text-ink">{t("reports.topSellingItems")}</h2>
            <ul className="flex flex-col gap-2">
              {topItems.map((item) => (
                <li key={item.name} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
                  <span className="flex-1 truncate text-senior-sm font-medium text-ink">{item.name}</span>
                  <span className="text-senior-xs text-ink-tertiary">x{item.quantity}</span>
                  <span className="text-senior-sm font-bold text-ink">{item.total.toLocaleString("en-PK")}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-senior-base font-bold text-ink">{t("reports.topCustomers")}</h2>
          {topCustomers.length === 0 ? (
            <p className="text-senior-sm text-ink-secondary">{t("common.notEnoughData")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {topCustomers.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => setOpenCustomerId(customer.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-start transition active:scale-[0.99] active:bg-surface-alt"
                  >
                    <span className="flex-1 truncate text-senior-sm font-medium text-ink">{customer.name}</span>
                    <Badge variant={customer.current_balance > 0 ? "danger" : "success"}>
                      {customer.current_balance > 0 ? t("khata.toReceive") : t("khata.toPay")}
                    </Badge>
                    <span className="shrink-0 text-senior-sm font-bold text-ink">
                      {Math.abs(customer.current_balance).toLocaleString("en-PK")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {openCustomer && (
        <CustomerTransactionModal
          customer={openCustomer}
          shopLabel={shopLabel}
          onClose={() => setOpenCustomerId(null)}
          onSaved={reload}
          onDeleted={() => {
            setOpenCustomerId(null);
            reload();
          }}
        />
      )}

      {openAccount && (
        <BankTransactionModal
          account={openAccount}
          accounts={bankAccounts}
          onClose={() => setOpenAccountId(null)}
          onSaved={reload}
          onDeleted={() => {
            setOpenAccountId(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
