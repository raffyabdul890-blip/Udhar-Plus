"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import SearchBar from "@/components/dashboard/SearchBar";
import ModuleSwitcher, { type DashboardModule } from "@/components/dashboard/ModuleSwitcher";
import CustomerList from "@/components/customers/CustomerList";
import AddCustomerModal from "@/components/customers/AddCustomerModal";
import CustomerTransactionModal from "@/components/customers/CustomerTransactionModal";
import BankList from "@/components/bank/BankList";
import AddBankAccountModal from "@/components/bank/AddBankAccountModal";
import BankTransactionModal from "@/components/bank/BankTransactionModal";
import {
  getAllTransactions,
  getBankAccounts,
  getCustomers,
  type LocalBankAccount,
  type LocalCustomer,
  type LocalTransaction,
} from "@/lib/db/offlineStorage";

type ActiveModal =
  | { kind: "none" }
  | { kind: "add-customer" }
  | { kind: "customer-txn"; customer: LocalCustomer }
  | { kind: "add-bank" }
  | { kind: "bank-txn"; account: LocalBankAccount };

export default function DashboardShell({
  userId,
  identityLabel,
}: {
  userId: string;
  identityLabel: string;
}) {
  const [module, setModule] = useState<DashboardModule>("customers");
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<LocalBankAccount[]>([]);
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ActiveModal>({ kind: "none" });

  const reload = useCallback(async () => {
    const [customerRows, bankRows, transactionRows] = await Promise.all([
      getCustomers(userId),
      getBankAccounts(userId),
      getAllTransactions(userId),
    ]);
    setCustomers(customerRows);
    setBankAccounts(bankRows);
    setTransactions(transactionRows);
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

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-senior-2xl font-bold text-brand-white">Udhar Plus</h1>
          <p className="truncate text-senior-sm text-brand-white/70">{identityLabel}</p>
        </div>
        <LogoutButton />
      </div>

      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 bg-brand-black px-4 py-3">
        <SearchBar value={search} onChange={setSearch} />
        {!isSearching && <ModuleSwitcher active={module} onChange={setModule} />}
      </div>

      {isSearching ? (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-senior-base font-bold text-brand-white">Customers</h2>
            {matchedCustomers.length === 0 ? (
              <p className="text-senior-sm text-brand-white/60">No matching customers.</p>
            ) : (
              <CustomerList
                customers={matchedCustomers}
                transactions={transactions}
                loading={false}
                onSelectCustomer={(customer) => setModal({ kind: "customer-txn", customer })}
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
                onSelectAccount={(account) => setModal({ kind: "bank-txn", account })}
              />
            )}
          </section>
        </div>
      ) : module === "customers" ? (
        <CustomerList
          customers={customers}
          transactions={transactions}
          loading={loading}
          onSelectCustomer={(customer) => setModal({ kind: "customer-txn", customer })}
        />
      ) : (
        <BankList
          accounts={bankAccounts}
          loading={loading}
          onSelectAccount={(account) => setModal({ kind: "bank-txn", account })}
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
          onAdded={reload}
        />
      )}
      {modal.kind === "customer-txn" && (
        <CustomerTransactionModal
          customer={modal.customer}
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
      {modal.kind === "bank-txn" && (
        <BankTransactionModal
          account={modal.account}
          onClose={() => setModal({ kind: "none" })}
          onSaved={reload}
        />
      )}
    </div>
  );
}
