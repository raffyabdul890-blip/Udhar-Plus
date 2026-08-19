"use client";

import { useCallback, useEffect, useState } from "react";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import { getCustomers, type LocalCustomer } from "@/lib/db/offlineStorage";

export default function ReportsTab({ userId }: { userId: string }) {
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setCustomers(await getCustomers(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Synchronizing with IndexedDB (an external store), not deriving state from props —
    // the textbook valid effect use case, just one the new lint rule can't tell apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  if (loading) {
    return <CustomerCardSkeletonList count={3} label="Loading reports" />;
  }

  const totalReceivable = customers.reduce((sum, c) => sum + Math.max(c.current_balance, 0), 0);
  const totalPayable = customers.reduce((sum, c) => sum + Math.max(-c.current_balance, 0), 0);
  const topCustomers = [...customers]
    .filter((c) => c.current_balance > 0)
    .sort((a, b) => b.current_balance - a.current_balance)
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl bg-brand-charcoal/40 p-4">
          <p className="text-senior-xs text-brand-white/60">Total Receivable</p>
          <p className="text-senior-xl font-bold text-brand-red">
            {totalReceivable.toLocaleString("en-PK")}
          </p>
        </div>
        <div className="flex-1 rounded-xl bg-brand-charcoal/40 p-4">
          <p className="text-senior-xs text-brand-white/60">Total Payable</p>
          <p className="text-senior-xl font-bold text-brand-green">
            {totalPayable.toLocaleString("en-PK")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-senior-base font-bold text-brand-white">
          Top Customers by Balance Owed
        </h2>
        {topCustomers.length === 0 ? (
          <p className="text-senior-sm text-brand-white/60">No outstanding balances.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {topCustomers.map((customer, index) => (
              <li
                key={customer.id}
                className="flex items-center gap-3 rounded-xl bg-brand-charcoal/40 px-3 py-2"
              >
                <span className="text-senior-sm font-bold text-brand-white/50">#{index + 1}</span>
                <span className="flex-1 truncate text-senior-sm font-medium text-brand-white">
                  {customer.name}
                </span>
                <span className="text-senior-sm font-bold text-brand-red">
                  {customer.current_balance.toLocaleString("en-PK")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="rounded-xl border border-brand-charcoal bg-brand-charcoal/20 p-4 text-senior-xs text-brand-white/50">
        Daily/weekly trend charts and PDF/CSV export are planned for a follow-up update.
      </p>
    </div>
  );
}
