"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SearchBar from "@/components/dashboard/SearchBar";
import BankList from "@/components/bank/BankList";
import AddBankAccountModal from "@/components/bank/AddBankAccountModal";
import BankTransactionModal from "@/components/bank/BankTransactionModal";
import Button from "@/components/ui/Button";
import Amount from "@/components/ui/Amount";
import { getFinancialInstitution } from "@/lib/constants/banks";
import { getBankAccounts, type LocalBankAccount } from "@/lib/db/offlineStorage";
import { usePreferences } from "@/components/providers/PreferencesProvider";

type ActiveModal = { kind: "none" } | { kind: "add-account" } | { kind: "account-txn"; accountId: string };

export default function BankWalletTab({ userId }: { userId: string }) {
  const { t } = usePreferences();
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<LocalBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ActiveModal>({ kind: "none" });

  const reload = useCallback(async () => {
    setAccounts(await getBankAccounts(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Synchronizing with IndexedDB (an external store), not deriving state from props —
    // the textbook valid effect use case, just one the new lint rule can't tell apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const query = search.trim().toLowerCase();
  const matchedAccounts = useMemo(() => {
    if (!query) return accounts;
    return accounts.filter(
      (a) =>
        a.bank_name.toLowerCase().includes(query) ||
        a.account_title.toLowerCase().includes(query) ||
        a.account_number.toLowerCase().includes(query)
    );
  }, [accounts, query]);

  const totalBank = accounts
    .filter((a) => getFinancialInstitution(a.bank_code)?.category === "bank")
    .reduce((sum, a) => sum + a.current_balance, 0);
  const totalWallet = accounts
    .filter((a) => getFinancialInstitution(a.bank_code)?.category === "wallet")
    .reduce((sum, a) => sum + a.current_balance, 0);

  const openAccount = modal.kind === "account-txn" ? accounts.find((a) => a.id === modal.accountId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      {!query && (
        <>
          <p className="rounded-xl border border-primary/20 bg-primary-light px-4 py-3 text-senior-xs text-primary">
            {t("bank.disclaimer")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
              <p className="text-senior-xs font-medium text-ink-secondary">{t("bank.totalBank")}</p>
              <Amount value={totalBank} className="text-senior-xl font-bold text-ink" />
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
              <p className="text-senior-xs font-medium text-ink-secondary">{t("bank.totalWallet")}</p>
              <Amount value={totalWallet} className="text-senior-xl font-bold text-ink" />
            </div>
          </div>
        </>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder={t("bank.searchPlaceholder")} />

      <BankList
        accounts={matchedAccounts}
        loading={loading}
        onSelectAccount={(account) => setModal({ kind: "account-txn", accountId: account.id })}
      />

      {!query && (
        <Button icon="plus" fullWidth onClick={() => setModal({ kind: "add-account" })}>
          {t("bank.addAccount")}
        </Button>
      )}

      {modal.kind === "add-account" && (
        <AddBankAccountModal userId={userId} onClose={() => setModal({ kind: "none" })} onAdded={reload} />
      )}
      {modal.kind === "account-txn" && openAccount && (
        <BankTransactionModal
          account={openAccount}
          accounts={accounts}
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
