"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SearchBar from "@/components/dashboard/SearchBar";
import ModuleSwitcher, { type DashboardModule } from "@/components/dashboard/ModuleSwitcher";
import KhataHeaderStats from "@/components/dashboard/KhataHeaderStats";
import CustomerList from "@/components/customers/CustomerList";
import AddCustomerModal, { type PostAddAction } from "@/components/customers/AddCustomerModal";
import CustomerTransactionModal, {
  type EntryType,
} from "@/components/customers/CustomerTransactionModal";
import WhatsAppReminderModal from "@/components/customers/WhatsAppReminderModal";
import BankList from "@/components/bank/BankList";
import AddBankAccountModal from "@/components/bank/AddBankAccountModal";
import BankTransactionModal from "@/components/bank/BankTransactionModal";
import {
  getBankAccounts,
  getCustomers,
  type LocalBankAccount,
  type LocalCustomer,
} from "@/lib/db/offlineStorage";

type ActiveModal =
  | { kind: "none" }
  | { kind: "add-customer" }
  | { kind: "customer-txn"; customerId: string; initialEntryType?: EntryType }
  | { kind: "whatsapp"; customerId: string }
  | { kind: "add-bank" }
  | { kind: "bank-txn"; accountId: string };

export default function KhataTab({ userId, shopLabel }: { userId: string; shopLabel: string }) {
  const [module, setModule] = useState<DashboardModule>("customers");
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<LocalBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ActiveModal>({ kind: "none" });

  // Deliberately doesn't load the transactions table here — customer "last
  // entry" comes from the denormalized LocalCustomer.last_transaction_at, and
  // each transaction modal fetches only its own entity's history on demand
  // (see CustomerTransactionModal/BankTransactionModal), so this tab stays
  // fast regardless of how much history the shop has accumulated.
  const reload = useCallback(async () => {
    const [customerRows, bankRows] = await Promise.all([getCustomers(userId), getBankAccounts(userId)]);
    setCustomers(customerRows);
    setBankAccounts(bankRows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Synchronizing with IndexedDB (an external store), not deriving state from props —
    // the textbook valid effect use case, just one the new lint rule can't tell apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;

  const matchedCustomers = useMemo(() => {
    if (!query) return [];
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.description ?? "").toLowerCase().includes(query) ||
        (c.phone ?? "").toLowerCase().includes(query) ||
        String(c.current_balance).includes(query)
    );
  }, [customers, query]);

  const matchedBankAccounts = useMemo(() => {
    if (!query) return [];
    return bankAccounts.filter(
      (b) =>
        b.bank_name.toLowerCase().includes(query) ||
        b.account_title.toLowerCase().includes(query) ||
        b.account_number.toLowerCase().includes(query) ||
        String(b.current_balance).includes(query)
    );
  }, [bankAccounts, query]);

  const openCustomer =
    modal.kind === "customer-txn" || modal.kind === "whatsapp"
      ? customers.find((c) => c.id === modal.customerId)
      : undefined;
  const openAccount =
    modal.kind === "bank-txn" ? bankAccounts.find((b) => b.id === modal.accountId) : undefined;

  function handleCustomerAdded(customer: LocalCustomer, action: PostAddAction) {
    reload();
    if (action === "give") {
      setModal({ kind: "customer-txn", customerId: customer.id, initialEntryType: "DIYE" });
    } else if (action === "receive") {
      setModal({ kind: "customer-txn", customerId: customer.id, initialEntryType: "MILAY" });
    } else if (action === "whatsapp") {
      setModal({ kind: "whatsapp", customerId: customer.id });
    } else {
      setModal({ kind: "none" });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!isSearching && <KhataHeaderStats customers={customers} />}

      <SearchBar value={search} onChange={setSearch} />
      {!isSearching && <ModuleSwitcher active={module} onChange={setModule} />}

      {isSearching ? (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-senior-base font-bold text-brand-white">Customers</h2>
            {matchedCustomers.length === 0 ? (
              <p className="text-senior-sm text-brand-white/60">No matching customers.</p>
            ) : (
              <CustomerList
                customers={matchedCustomers}
                loading={false}
                onSelectCustomer={(customer) =>
                  setModal({ kind: "customer-txn", customerId: customer.id })
                }
              />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-senior-base font-bold text-brand-white">Bank & Wallet Accounts</h2>
            {matchedBankAccounts.length === 0 ? (
              <p className="text-senior-sm text-brand-white/60">No matching accounts.</p>
            ) : (
              <BankList
                accounts={matchedBankAccounts}
                loading={false}
                onSelectAccount={(account) =>
                  setModal({ kind: "bank-txn", accountId: account.id })
                }
              />
            )}
          </section>
        </div>
      ) : module === "customers" ? (
        <CustomerList
          customers={customers}
          loading={loading}
          onSelectCustomer={(customer) =>
            setModal({ kind: "customer-txn", customerId: customer.id })
          }
        />
      ) : (
        <BankList
          accounts={bankAccounts}
          loading={loading}
          onSelectAccount={(account) => setModal({ kind: "bank-txn", accountId: account.id })}
        />
      )}

      {!isSearching && (
        <button
          type="button"
          onClick={() =>
            setModal(module === "customers" ? { kind: "add-customer" } : { kind: "add-bank" })
          }
          className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred"
        >
          {module === "customers" ? "+ Add Customer" : "+ Add Bank / Wallet Account"}
        </button>
      )}

      {modal.kind === "add-customer" && (
        <AddCustomerModal
          userId={userId}
          onClose={() => setModal({ kind: "none" })}
          onAdded={handleCustomerAdded}
        />
      )}
      {modal.kind === "customer-txn" && openCustomer && (
        <CustomerTransactionModal
          customer={openCustomer}
          shopLabel={shopLabel}
          initialEntryType={modal.initialEntryType}
          onClose={() => setModal({ kind: "none" })}
          onSaved={reload}
          onDeleted={() => {
            setModal({ kind: "none" });
            reload();
          }}
        />
      )}
      {modal.kind === "whatsapp" && openCustomer && (
        <WhatsAppReminderModal
          customer={openCustomer}
          onClose={() => setModal({ kind: "none" })}
          onSaved={reload}
        />
      )}
      {modal.kind === "add-bank" && (
        <AddBankAccountModal
          userId={userId}
          onClose={() => setModal({ kind: "none" })}
          onAdded={reload}
        />
      )}
      {modal.kind === "bank-txn" && openAccount && (
        <BankTransactionModal
          account={openAccount}
          onClose={() => setModal({ kind: "none" })}
          onSaved={reload}
          onDeleted={() => {
            setModal({ kind: "none" });
            reload();
          }}
        />
      )}
    </div>
  );
}
