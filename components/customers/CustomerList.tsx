"use client";

import { useMemo } from "react";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import type { LocalCustomer, LocalTransaction } from "@/lib/db/offlineStorage";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CustomerList({
  customers,
  transactions,
  loading,
  onSelectCustomer,
}: {
  customers: LocalCustomer[];
  transactions: LocalTransaction[];
  loading: boolean;
  onSelectCustomer: (customer: LocalCustomer) => void;
}) {
  const lastEntryByCustomer = useMemo(() => {
    const map = new Map<string, string>();
    for (const txn of transactions) {
      if (txn.entity_type !== "customer") continue;
      const existing = map.get(txn.entity_id);
      if (!existing || txn.transaction_date > existing) {
        map.set(txn.entity_id, txn.transaction_date);
      }
    }
    return map;
  }, [transactions]);

  if (loading) {
    return <CustomerCardSkeletonList count={4} />;
  }

  if (customers.length === 0) {
    return (
      <p className="rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-6 text-center text-senior-base text-brand-white/80">
        No customers yet. Add your first customer to start tracking udhar.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {customers.map((customer) => {
        const lastEntry = lastEntryByCustomer.get(customer.id);
        return (
          <li key={customer.id}>
            <button
              type="button"
              onClick={() => onSelectCustomer(customer)}
              className="flex min-h-tap w-full items-center gap-4 rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-4 text-left transition active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-charcoal text-senior-base font-bold text-brand-white">
                {customer.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                <span className="truncate text-senior-base font-bold text-brand-white">
                  {customer.name}
                </span>
                <span className="truncate text-senior-sm text-brand-white/70">
                  {lastEntry ? `Last entry ${formatDate(lastEntry)}` : "No entries yet"}
                </span>
              </div>

              <span
                className={`shrink-0 text-senior-lg font-bold ${
                  customer.current_balance > 0
                    ? "text-brand-red"
                    : customer.current_balance < 0
                      ? "text-brand-green"
                      : "text-brand-white"
                }`}
              >
                {customer.current_balance.toLocaleString("en-PK")}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
