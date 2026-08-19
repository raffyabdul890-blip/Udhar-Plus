"use client";

import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import AvatarInitial from "@/components/ui/AvatarInitial";
import Badge from "@/components/ui/Badge";
import type { LocalCustomer } from "@/lib/db/offlineStorage";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CustomerList({
  customers,
  loading,
  onSelectCustomer,
}: {
  customers: LocalCustomer[];
  loading: boolean;
  onSelectCustomer: (customer: LocalCustomer) => void;
}) {
  if (loading) {
    return <CustomerCardSkeletonList count={4} />;
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="No customers yet"
        description="Add your first customer to start tracking udhar."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-3">
      {customers.map((customer, index) => {
        const lastEntry = customer.last_transaction_at;
        return (
          <li key={customer.id} style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }} className="animate-fade-in-up">
            <button
              type="button"
              onClick={() => onSelectCustomer(customer)}
              className="flex min-h-tap w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left shadow-card transition active:scale-[0.99] active:bg-surface-alt"
            >
              <AvatarInitial name={customer.name} />

              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                <span className="truncate text-senior-base font-bold text-ink">{customer.name}</span>
                <span className="truncate text-senior-xs text-ink-secondary">
                  {customer.phone ?? (lastEntry ? `Last entry ${formatDate(lastEntry)}` : "No entries yet")}
                </span>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`text-senior-base font-bold ${
                    customer.current_balance > 0
                      ? "text-danger"
                      : customer.current_balance < 0
                        ? "text-success-dark"
                        : "text-ink"
                  }`}
                >
                  {Math.abs(customer.current_balance).toLocaleString("en-PK")}
                </span>
                {customer.current_balance !== 0 && (
                  <Badge variant={customer.current_balance > 0 ? "danger" : "success"}>
                    {customer.current_balance > 0 ? "To Receive" : "To Pay"}
                  </Badge>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
