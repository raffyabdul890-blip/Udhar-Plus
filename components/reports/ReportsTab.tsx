"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import SimpleBarChart from "@/components/reports/SimpleBarChart";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import CustomerTransactionModal from "@/components/customers/CustomerTransactionModal";
import {
  getAllTransactions,
  getCashbookEntries,
  getCustomers,
  type CashbookEntry,
  type LocalCustomer,
  type LocalTransaction,
} from "@/lib/db/offlineStorage";
import { isWithinRange, resolveDateRange, type DateRangePreset } from "@/lib/utils/dateRange";

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

export default function ReportsTab({ userId, shopLabel }: { userId: string; shopLabel: string }) {
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [cashbookEntries, setCashbookEntries] = useState<CashbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("today");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [customerRows, transactionRows, cashbookRows] = await Promise.all([
      getCustomers(userId),
      getAllTransactions(userId),
      getCashbookEntries(userId),
    ]);
    setCustomers(customerRows);
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

  const range = useMemo(() => resolveDateRange(datePreset, customRange), [datePreset, customRange]);

  // ---- Money (always-current, like Receivable/Payable — not range-filtered) ----
  const totalReceivable = customers.reduce((sum, c) => sum + Math.max(c.current_balance, 0), 0);
  const totalPayable = customers.reduce((sum, c) => sum + Math.max(-c.current_balance, 0), 0);
  const cashBalance = cashbookEntries
    .filter(isCashEntry)
    .reduce((sum, e) => sum + (e.type === "IN" ? e.amount : -e.amount), 0);

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
    for (const t of salesInRange) {
      for (const item of t.items ?? []) {
        const key = item.itemId ?? item.name;
        const existing = byItem.get(key) ?? { name: item.name || "Item", quantity: 0, total: 0 };
        existing.quantity += item.quantity;
        existing.total += item.quantity * item.pricePerUnit;
        byItem.set(key, existing);
      }
    }
    return [...byItem.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [salesInRange]);

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

  if (loading) {
    return <CustomerCardSkeletonList count={3} label="Loading reports" />;
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

      <section className="flex flex-col gap-3">
        <h2 className="text-senior-base font-bold text-brand-white">Business Overview</h2>
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          <div className="rounded-xl bg-brand-charcoal/40 p-3">
            <p className="text-senior-xs text-brand-white/60">Receivable</p>
            <p className="text-senior-lg font-bold text-brand-red">
              {totalReceivable.toLocaleString("en-PK")}
            </p>
          </div>
          <div className="rounded-xl bg-brand-charcoal/40 p-3">
            <p className="text-senior-xs text-brand-white/60">Payable</p>
            <p className="text-senior-lg font-bold text-brand-green">
              {totalPayable.toLocaleString("en-PK")}
            </p>
          </div>
          <div className="rounded-xl bg-brand-charcoal/40 p-3">
            <p className="text-senior-xs text-brand-white/60">Cash Balance</p>
            <p className="text-senior-lg font-bold text-brand-white">
              {cashBalance.toLocaleString("en-PK")}
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-senior-base font-bold text-brand-white">
          Sales &amp; Expenses — {datePreset === "custom" ? "Selected range" : ""}
        </h2>
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          <div className="rounded-xl bg-brand-charcoal/40 p-3">
            <p className="text-senior-xs text-brand-white/60">Sales</p>
            <p className="text-senior-lg font-bold text-brand-green">
              {totalSales.toLocaleString("en-PK")}
            </p>
            <p className="text-senior-xs text-brand-white/50">{salesCount} sale{salesCount === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-xl bg-brand-charcoal/40 p-3">
            <p className="text-senior-xs text-brand-white/60">Expenses</p>
            <p className="text-senior-lg font-bold text-brand-red">
              {totalExpenses.toLocaleString("en-PK")}
            </p>
            <p className="text-senior-xs text-brand-white/50">
              {expensesInRange.length} expense{expensesInRange.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-xl bg-brand-charcoal/40 p-3">
            <p className="text-senior-xs text-brand-white/60">Net Cash Flow</p>
            <p
              className={`text-senior-lg font-bold ${netCashFlow >= 0 ? "text-brand-green" : "text-brand-red"}`}
            >
              {netCashFlow.toLocaleString("en-PK")}
            </p>
          </div>
        </div>
        {salesCount > 0 && (
          <p className="text-senior-xs text-brand-white/50">
            Average sale: Rs. {avgSale.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-senior-base font-bold text-brand-white">Cash Flow</h2>
        <div className="rounded-xl bg-brand-charcoal/40 p-4">
          <SimpleBarChart
            bars={[
              { label: "Money In", value: moneyIn, colorClassName: "bg-brand-green" },
              { label: "Money Out", value: moneyOut, colorClassName: "bg-brand-red" },
            ]}
          />
        </div>
      </section>

      {expensesByCategory.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-senior-base font-bold text-brand-white">Expenses by Category</h2>
          <div className="rounded-xl bg-brand-charcoal/40 p-4">
            <SimpleBarChart
              bars={expensesByCategory.map(([category, total]) => ({ label: category, value: total }))}
            />
          </div>
        </section>
      )}

      {topItems.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-senior-base font-bold text-brand-white">Top Selling Items</h2>
          <ul className="flex flex-col gap-2">
            {topItems.map((item) => (
              <li
                key={item.name}
                className="flex items-center gap-3 rounded-xl bg-brand-charcoal/40 px-3 py-2"
              >
                <span className="flex-1 truncate text-senior-sm font-medium text-brand-white">
                  {item.name}
                </span>
                <span className="text-senior-xs text-brand-white/60">x{item.quantity}</span>
                <span className="text-senior-sm font-bold text-brand-white">
                  {item.total.toLocaleString("en-PK")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-senior-base font-bold text-brand-white">Top Customers</h2>
        {topCustomers.length === 0 ? (
          <p className="text-senior-sm text-brand-white/60">Not enough data yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {topCustomers.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => setOpenCustomerId(customer.id)}
                  className="flex w-full items-center gap-3 rounded-xl bg-brand-charcoal/40 px-3 py-2 text-left transition active:scale-[0.99]"
                >
                  <span className="flex-1 truncate text-senior-sm font-medium text-brand-white">
                    {customer.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-senior-xs font-bold ${
                      customer.current_balance > 0
                        ? "bg-brand-red/20 text-brand-red"
                        : "bg-brand-green/20 text-brand-green"
                    }`}
                  >
                    {customer.current_balance > 0 ? "TO RECEIVE" : "TO PAY"}
                  </span>
                  <span className="shrink-0 text-senior-sm font-bold text-brand-white">
                    {Math.abs(customer.current_balance).toLocaleString("en-PK")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
    </div>
  );
}
