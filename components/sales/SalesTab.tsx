"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import Button from "@/components/ui/Button";
import Amount from "@/components/ui/Amount";
import Icon from "@/components/icons/Icon";
import EmptyState from "@/components/ui/EmptyState";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import PickCustomerModal from "@/components/customers/PickCustomerModal";
import AddCustomerModal from "@/components/customers/AddCustomerModal";
import CustomerTransactionModal from "@/components/customers/CustomerTransactionModal";
import {
  getAllTransactions,
  getCustomers,
  type LocalCustomer,
  type LocalTransaction,
} from "@/lib/db/offlineStorage";
import { isWithinRange, resolveDateRange, type DateRangePreset } from "@/lib/utils/dateRange";

type ActiveModal =
  | { kind: "none" }
  | { kind: "pick-customer" }
  | { kind: "add-customer" }
  | { kind: "customer-txn"; customerId: string; forNewSale?: boolean };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SalesTab({ userId, shopLabel }: { userId: string; shopLabel: string }) {
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("month");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [modal, setModal] = useState<ActiveModal>({ kind: "none" });

  const reload = useCallback(async () => {
    const [customerRows, transactionRows] = await Promise.all([
      getCustomers(userId),
      getAllTransactions(userId),
    ]);
    setCustomers(customerRows);
    setTransactions(transactionRows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Synchronizing with IndexedDB (an external store), not deriving state from props —
    // the textbook valid effect use case, just one the new lint rule can't tell apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const range = useMemo(() => resolveDateRange(datePreset, customRange), [datePreset, customRange]);
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const sales = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.entity_type === "customer" &&
            t.type === "OUT" &&
            t.items &&
            t.items.length > 0 &&
            isWithinRange(t.transaction_date, range)
        )
        .sort((a, b) => (a.transaction_date < b.transaction_date ? 1 : -1)),
    [transactions, range]
  );

  const totalSales = sales.reduce((sum, t) => sum + t.amount, 0);
  const openCustomer = modal.kind === "customer-txn" ? customerById.get(modal.customerId) : undefined;

  function closeModal() {
    setModal({ kind: "none" });
  }

  if (loading) {
    return <CustomerCardSkeletonList count={3} label="Loading sales" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <DateRangeFilter
        presets={["today", "week", "month", "custom"]}
        value={datePreset}
        customRange={customRange}
        onChange={(preset, next) => {
          setDatePreset(preset);
          setCustomRange(next);
        }}
      />

      <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
        <p className="text-senior-sm font-medium text-ink-secondary">Sales</p>
        <Amount value={totalSales} className="text-senior-3xl font-bold text-success-dark" />
        <p className="text-senior-xs text-ink-tertiary">{sales.length} sale{sales.length === 1 ? "" : "s"}</p>
      </div>

      <Button icon="plus" fullWidth onClick={() => setModal({ kind: "pick-customer" })}>
        New Sale
      </Button>

      {sales.length === 0 ? (
        <EmptyState icon="sales" title="No sales yet" description="Sales are itemized Give Udhaar entries — tap New Sale to bill a customer." />
      ) : (
        <ul className="flex flex-col gap-2">
          {sales.map((sale) => {
            const customer = customerById.get(sale.entity_id);
            return (
              <li key={sale.id}>
                <button
                  type="button"
                  onClick={() => setModal({ kind: "customer-txn", customerId: sale.entity_id })}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition active:scale-[0.99] active:bg-surface-alt"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                    <Icon name="sales" size={17} />
                  </span>
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-senior-sm font-bold text-ink">
                      {customer?.name ?? "Customer"}
                    </span>
                    <span className="truncate text-senior-xs text-ink-secondary">
                      {sale.items?.length} item{(sale.items?.length ?? 0) > 1 ? "s" : ""} ·{" "}
                      {formatDateTime(sale.transaction_date)}
                    </span>
                  </div>
                  <span className="shrink-0 text-senior-sm font-bold text-ink">
                    {sale.amount.toLocaleString("en-PK")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {modal.kind === "pick-customer" && (
        <PickCustomerModal
          customers={customers}
          title="New Sale — Choose Customer"
          onClose={closeModal}
          onPick={(customer) => setModal({ kind: "customer-txn", customerId: customer.id, forNewSale: true })}
          onAddNew={() => setModal({ kind: "add-customer" })}
        />
      )}
      {modal.kind === "add-customer" && (
        <AddCustomerModal
          userId={userId}
          onClose={closeModal}
          onAdded={(customer) => {
            reload();
            setModal({ kind: "customer-txn", customerId: customer.id, forNewSale: true });
          }}
        />
      )}
      {modal.kind === "customer-txn" && openCustomer && (
        <CustomerTransactionModal
          customer={openCustomer}
          shopLabel={shopLabel}
          initialEntryType={modal.forNewSale ? "DIYE" : undefined}
          initialShowItems={modal.forNewSale}
          onClose={closeModal}
          onSaved={reload}
          onDeleted={() => {
            closeModal();
            reload();
          }}
        />
      )}
    </div>
  );
}
