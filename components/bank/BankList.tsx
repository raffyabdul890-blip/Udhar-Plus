import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import BankLogoBadge from "@/components/bank/BankLogoBadge";
import { getFinancialInstitution } from "@/lib/constants/banks";
import type { LocalBankAccount } from "@/lib/db/offlineStorage";

export default function BankList({
  accounts,
  loading,
  onSelectAccount,
}: {
  accounts: LocalBankAccount[];
  loading: boolean;
  onSelectAccount: (account: LocalBankAccount) => void;
}) {
  if (loading) {
    return <CustomerCardSkeletonList count={4} label="Loading bank accounts" />;
  }

  if (accounts.length === 0) {
    return (
      <p className="rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-6 text-center text-senior-base text-brand-white/80">
        No bank or wallet accounts yet. Add one to start tracking cash flow.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {accounts.map((account) => {
        const category = getFinancialInstitution(account.bank_code)?.category;
        return (
        <li key={account.id}>
          <button
            type="button"
            onClick={() => onSelectAccount(account)}
            className="flex min-h-tap w-full items-center gap-4 rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-4 text-left transition active:scale-[0.99]"
          >
            <BankLogoBadge bankCode={account.bank_code} />

            <div className="flex flex-1 flex-col gap-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="truncate text-senior-base font-bold text-brand-white">
                  {account.account_title}
                </span>
                {category && (
                  <span className="shrink-0 rounded-full bg-brand-black/40 px-2 py-0.5 text-senior-xs font-medium text-brand-white/60">
                    {category === "bank" ? "Bank" : "Wallet"}
                  </span>
                )}
              </div>
              <span className="truncate text-senior-sm text-brand-white/70">
                {account.bank_name} · {account.account_number}
              </span>
            </div>

            <span
              className={`shrink-0 text-senior-lg font-bold ${
                account.current_balance < 0 ? "text-brand-red" : "text-brand-white"
              }`}
            >
              {account.current_balance.toLocaleString("en-PK")}
            </span>
          </button>
        </li>
        );
      })}
    </ul>
  );
}
