"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SearchBar from "@/components/dashboard/SearchBar";
import KhataHeaderStats from "@/components/dashboard/KhataHeaderStats";
import CustomerList from "@/components/customers/CustomerList";
import AddCustomerModal, { type PostAddAction } from "@/components/customers/AddCustomerModal";
import PickCustomerModal from "@/components/customers/PickCustomerModal";
import CustomerTransactionModal, {
  type EntryType,
} from "@/components/customers/CustomerTransactionModal";
import WhatsAppReminderModal from "@/components/customers/WhatsAppReminderModal";
import Button from "@/components/ui/Button";
import { getCustomers, type LocalCustomer } from "@/lib/db/offlineStorage";

type ActiveModal =
  | { kind: "none" }
  | { kind: "add-customer"; pickPurpose?: "give" | "receive" | "sale" }
  | { kind: "pick-customer"; purpose: "give" | "receive" | "sale" }
  | { kind: "customer-txn"; customerId: string; initialEntryType?: EntryType; initialShowItems?: boolean }
  | { kind: "whatsapp"; customerId: string };

export default function KhataTab({
  userId,
  shopLabel,
  pendingAction,
  onPendingActionHandled,
}: {
  userId: string;
  shopLabel: string;
  /** Set by a Dashboard quick action that needs a customer picker (or the add-customer form) before it can proceed. */
  pendingAction?: "give" | "receive" | "sale" | "customer" | null;
  onPendingActionHandled?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ActiveModal>({ kind: "none" });

  // Deliberately doesn't load the transactions table here — customer "last
  // entry" comes from the denormalized LocalCustomer.last_transaction_at, and
  // each transaction modal fetches only its own entity's history on demand
  // (see CustomerTransactionModal), so this tab stays fast regardless of how
  // much history the shop has accumulated.
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

  useEffect(() => {
    if (pendingAction && modal.kind === "none") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModal(pendingAction === "customer" ? { kind: "add-customer" } : { kind: "pick-customer", purpose: pendingAction });
    }
  }, [pendingAction, modal.kind]);

  const query = search.trim().toLowerCase();
  const matchedCustomers = useMemo(() => {
    if (!query) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.description ?? "").toLowerCase().includes(query) ||
        (c.phone ?? "").toLowerCase().includes(query) ||
        String(c.current_balance).includes(query)
    );
  }, [customers, query]);

  const openCustomer =
    modal.kind === "customer-txn" || modal.kind === "whatsapp"
      ? customers.find((c) => c.id === modal.customerId)
      : undefined;

  function closeModal() {
    setModal({ kind: "none" });
    onPendingActionHandled?.();
  }

  function openTxnForPurpose(customerId: string, purpose: "give" | "receive" | "sale") {
    if (purpose === "sale") {
      setModal({ kind: "customer-txn", customerId, initialEntryType: "DIYE", initialShowItems: true });
    } else {
      setModal({
        kind: "customer-txn",
        customerId,
        initialEntryType: purpose === "give" ? "DIYE" : "MILAY",
      });
    }
  }

  function handleCustomerAdded(customer: LocalCustomer, action: PostAddAction) {
    reload();
    const pickPurpose = modal.kind === "add-customer" ? modal.pickPurpose : undefined;
    if (pickPurpose) {
      openTxnForPurpose(customer.id, pickPurpose);
    } else if (action === "give") {
      setModal({ kind: "customer-txn", customerId: customer.id, initialEntryType: "DIYE" });
    } else if (action === "receive") {
      setModal({ kind: "customer-txn", customerId: customer.id, initialEntryType: "MILAY" });
    } else if (action === "whatsapp") {
      setModal({ kind: "whatsapp", customerId: customer.id });
    } else {
      closeModal();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!query && <KhataHeaderStats customers={customers} />}

      <SearchBar value={search} onChange={setSearch} placeholder="Search customers, phone, amount…" />

      <CustomerList
        customers={matchedCustomers}
        loading={loading}
        onSelectCustomer={(customer) => setModal({ kind: "customer-txn", customerId: customer.id })}
      />

      {!query && (
        <Button icon="plus" fullWidth onClick={() => setModal({ kind: "add-customer" })}>
          Add Customer
        </Button>
      )}

      {modal.kind === "add-customer" && (
        <AddCustomerModal userId={userId} onClose={closeModal} onAdded={handleCustomerAdded} />
      )}
      {modal.kind === "pick-customer" && (
        <PickCustomerModal
          customers={customers}
          title={
            modal.purpose === "give" ? "Give Udhaar — Choose Customer" : modal.purpose === "receive" ? "Receive Payment — Choose Customer" : "New Sale — Choose Customer"
          }
          onClose={closeModal}
          onPick={(customer) => openTxnForPurpose(customer.id, modal.purpose)}
          onAddNew={() => setModal({ kind: "add-customer", pickPurpose: modal.purpose })}
        />
      )}
      {modal.kind === "customer-txn" && openCustomer && (
        <CustomerTransactionModal
          customer={openCustomer}
          shopLabel={shopLabel}
          initialEntryType={modal.initialEntryType}
          initialShowItems={modal.initialShowItems}
          onClose={closeModal}
          onSaved={reload}
          onDeleted={() => {
            closeModal();
            reload();
          }}
        />
      )}
      {modal.kind === "whatsapp" && openCustomer && (
        <WhatsAppReminderModal customer={openCustomer} onClose={closeModal} onSaved={reload} />
      )}
    </div>
  );
}
