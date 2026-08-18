"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import OnboardingModal from "@/components/auth/OnboardingModal";
import TopNavbar from "@/components/dashboard/TopNavbar";
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
import { isOnboardingCompleteLocally } from "@/lib/onboarding";

type ActiveModal =
  | { kind: "none" }
  | { kind: "add-customer" }
  | { kind: "customer-txn"; customerId: string }
  | { kind: "add-bank" }
  | { kind: "bank-txn"; accountId: string };

export default function DashboardShell({
  userId,
  phone,
  email,
  fullName: initialFullName,
  shopName: initialShopName,
  onboardingCompleted: initialOnboardingCompleted,
}: {
  userId: string;
  phone: string | null;
  email: string | null;
  fullName: string | null;
  shopName: string | null;
  onboardingCompleted: boolean;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [shopName, setShopName] = useState(initialShopName);
  const [onboardingCompleted, setOnboardingCompleted] = useState(initialOnboardingCompleted);
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

  useEffect(() => {
    // Checked post-mount (not in a lazy useState initializer) to avoid a hydration
    // mismatch — the server-rendered value always matches the first client render,
    // then this corrects it a moment later if localStorage says otherwise (e.g. a
    // skip that was saved locally before a Supabase metadata write could land).
    if (!onboardingCompleted && isOnboardingCompleteLocally(userId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOnboardingCompleted(true);
    }
  }, [onboardingCompleted, userId]);

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

  const needsOnboarding = !onboardingCompleted;
  const primaryLabel = shopName ?? fullName ?? "Udhar Plus";
  const secondaryLabel = shopName ? (fullName ?? undefined) : (phone ?? email ?? undefined);

  const openCustomer = modal.kind === "customer-txn" ? customers.find((c) => c.id === modal.customerId) : undefined;
  const openAccount = modal.kind === "bank-txn" ? bankAccounts.find((b) => b.id === modal.accountId) : undefined;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 bg-brand-black px-4 py-3">
        <TopNavbar primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />
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
                onSelectCustomer={(customer) => setModal({ kind: "customer-txn", customerId: customer.id })}
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
                onSelectAccount={(account) => setModal({ kind: "bank-txn", accountId: account.id })}
              />
            )}
          </section>
        </div>
      ) : module === "customers" ? (
        <CustomerList
          customers={customers}
          transactions={transactions}
          loading={loading}
          onSelectCustomer={(customer) => setModal({ kind: "customer-txn", customerId: customer.id })}
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
          onAdded={reload}
        />
      )}
      {modal.kind === "customer-txn" && openCustomer && (
        <CustomerTransactionModal
          customer={openCustomer}
          transactions={transactions.filter(
            (t) => t.entity_type === "customer" && t.entity_id === openCustomer.id
          )}
          onClose={() => setModal({ kind: "none" })}
          onSaved={reload}
          onDeleted={() => {
            setModal({ kind: "none" });
            reload();
          }}
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
          transactions={transactions.filter(
            (t) => t.entity_type === "bank" && t.entity_id === openAccount.id
          )}
          onClose={() => setModal({ kind: "none" })}
          onSaved={reload}
          onDeleted={() => {
            setModal({ kind: "none" });
            reload();
          }}
        />
      )}

      {needsOnboarding && (
        <OnboardingModal
          userId={userId}
          onComplete={({ fullName: newFullName, shopName: newShopName }) => {
            if (newFullName) setFullName(newFullName);
            if (newShopName) setShopName(newShopName);
            setOnboardingCompleted(true);
          }}
        />
      )}
    </div>
  );
}
