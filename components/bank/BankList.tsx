"use client";

import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import BankLogoBadge from "@/components/bank/BankLogoBadge";
import { getFinancialInstitution } from "@/lib/constants/banks";
import type { LocalBankAccount } from "@/lib/db/offlineStorage";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export default function BankList({
  accounts,
  loading,
  onSelectAccount,
}: {
  accounts: LocalBankAccount[];
  loading: boolean;
  onSelectAccount: (account: LocalBankAccount) => void;
}) {
  const { t } = usePreferences();

  if (loading) {
    return <CustomerCardSkeletonList count={4} label={t("bank.title")} />;
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon="bank"
        title={t("bank.noAccounts")}
        description={t("bank.noAccountsDescription")}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-3">
      {accounts.map((account) => {
        const category = getFinancialInstitution(account.bank_code)?.category;
        return (
          <li key={account.id}>
            <button
              type="button"
              onClick={() => onSelectAccount(account)}
              className="flex min-h-tap w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-start shadow-card transition active:scale-[0.99] active:bg-surface-alt"
            >
              <BankLogoBadge bankCode={account.bank_code} />

              <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="truncate text-senior-base font-bold text-ink">
                    {account.account_title}
                  </span>
                  {category && <Badge>{category === "bank" ? t("bank.typeBank") : t("bank.typeWallet")}</Badge>}
                </div>
                <span className="truncate text-senior-sm text-ink-secondary">
                  {account.bank_name} · {account.account_number}
                </span>
              </div>

              <span className={`shrink-0 text-senior-base font-bold ${account.current_balance < 0 ? "text-danger" : "text-ink"}`}>
                {account.current_balance.toLocaleString("en-PK")}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
