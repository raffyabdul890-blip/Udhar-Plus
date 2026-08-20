"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import SearchBar from "@/components/dashboard/SearchBar";
import AvatarInitial from "@/components/ui/AvatarInitial";
import EmptyState from "@/components/ui/EmptyState";
import type { LocalCustomer } from "@/lib/db/offlineStorage";
import { usePreferences } from "@/components/providers/PreferencesProvider";

/** Customer-picker used by quick actions that need a customer but don't start from one (Dashboard, Sales "+ New Sale"). */
export default function PickCustomerModal({
  customers,
  title,
  onClose,
  onPick,
  onAddNew,
}: {
  customers: LocalCustomer[];
  title?: string;
  onClose: () => void;
  onPick: (customer: LocalCustomer) => void;
  onAddNew: () => void;
}) {
  const { t } = usePreferences();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(query) || (c.phone ?? "").toLowerCase().includes(query)
    );
  }, [customers, search]);

  return (
    <Modal title={title ?? t("customer.chooseCustomer")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <SearchBar value={search} onChange={setSearch} placeholder={t("customer.searchPlaceholder")} />

        <button
          type="button"
          onClick={onAddNew}
          className="flex min-h-tap items-center justify-center rounded-xl border border-dashed border-primary/50 bg-primary-light px-4 text-senior-sm font-bold text-primary transition active:scale-[0.98]"
        >
          {t("customer.addNewCustomer")}
        </button>

        {filtered.length === 0 ? (
          <EmptyState icon="users" title={t("customer.noCustomersFound")} description={t("customer.noCustomersFoundDescription")} />
        ) : (
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {filtered.map((customer) => (
              <li key={customer.id} className="[content-visibility:auto] [contain-intrinsic-size:auto_72px]">
                <button
                  type="button"
                  onClick={() => onPick(customer)}
                  className="flex min-h-tap w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-start transition active:scale-[0.99] active:bg-surface-alt"
                >
                  <AvatarInitial name={customer.name} size="sm" />
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-senior-sm font-bold text-ink">{customer.name}</span>
                    {customer.phone && (
                      <span className="truncate text-senior-xs text-ink-secondary">{customer.phone}</span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-senior-sm font-bold ${
                      customer.current_balance > 0 ? "text-danger" : "text-success-dark"
                    }`}
                  >
                    {customer.current_balance.toLocaleString("en-PK")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
