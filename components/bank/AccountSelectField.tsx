"use client";

import { useState } from "react";
import Icon from "@/components/icons/Icon";
import Amount from "@/components/ui/Amount";
import BankLogoBadge from "@/components/bank/BankLogoBadge";
import AccountPickerModal from "@/components/bank/AccountPickerModal";
import { getFinancialInstitution } from "@/lib/constants/banks";
import type { LocalBankAccount } from "@/lib/db/offlineStorage";
import { usePreferences } from "@/components/providers/PreferencesProvider";

/** Picks among the shop's own bank/wallet accounts — shows logo, name, type, and balance instead of a plain <select>. Used wherever a form needs "which of my accounts" (Transfer destination, expense payment source). */
export default function AccountSelectField({
  label,
  accounts,
  value,
  onChange,
}: {
  label: string;
  accounts: LocalBankAccount[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = usePreferences();
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = accounts.find((a) => a.id === value);
  const institution = selected ? getFinancialInstitution(selected.bank_code) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-senior-base font-medium text-ink">{label}</label>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        disabled={accounts.length === 0}
        className="flex min-h-tap w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-start transition active:scale-[0.99] hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
      >
        {selected ? (
          <>
            <BankLogoBadge bankCode={selected.bank_code} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-senior-base font-bold text-ink">{selected.account_title}</p>
              <p className="truncate text-senior-xs text-ink-secondary">
                {institution?.name ?? selected.bank_name} ·{" "}
                {institution?.category === "wallet" ? t("bank.typeWallet") : t("bank.typeBank")}
              </p>
            </div>
            <Amount
              value={selected.current_balance}
              className={`shrink-0 text-senior-sm font-bold ${selected.current_balance < 0 ? "text-danger" : "text-ink"}`}
            />
          </>
        ) : (
          <span className="flex-1 text-senior-base text-ink-tertiary">{t("transaction.chooseAccount")}</span>
        )}
        <Icon name="chevron-down" size={18} className="shrink-0 text-ink-tertiary" />
      </button>

      {pickerOpen && (
        <AccountPickerModal
          accounts={accounts}
          selectedId={value}
          onSelect={onChange}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
