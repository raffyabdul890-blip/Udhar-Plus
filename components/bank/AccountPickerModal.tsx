"use client";

import Modal from "@/components/ui/Modal";
import Icon from "@/components/icons/Icon";
import Amount from "@/components/ui/Amount";
import BankLogoBadge from "@/components/bank/BankLogoBadge";
import { getFinancialInstitution } from "@/lib/constants/banks";
import type { LocalBankAccount } from "@/lib/db/offlineStorage";
import { usePreferences } from "@/components/providers/PreferencesProvider";

function OptionRow({
  account,
  selected,
  onClick,
}: {
  account: LocalBankAccount;
  selected: boolean;
  onClick: () => void;
}) {
  const { t } = usePreferences();
  const institution = getFinancialInstitution(account.bank_code);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-tap w-full items-center gap-3 rounded-xl px-2 py-2 text-start transition-colors duration-150 active:scale-[0.99] ${
        selected ? "bg-primary-light" : "hover:bg-surface-alt"
      }`}
    >
      <BankLogoBadge bankCode={account.bank_code} size="sm" />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-senior-base font-bold ${selected ? "text-primary" : "text-ink"}`}>
          {account.account_title}
        </p>
        <p className="truncate text-senior-xs text-ink-secondary">
          {institution?.name ?? account.bank_name} ·{" "}
          {institution?.category === "wallet" ? t("bank.typeWallet") : t("bank.typeBank")}
        </p>
      </div>
      <Amount
        value={account.current_balance}
        className={`shrink-0 text-senior-sm font-bold ${account.current_balance < 0 ? "text-danger" : "text-ink"}`}
      />
      {selected && <Icon name="check-circle" size={20} className="shrink-0 text-primary" />}
    </button>
  );
}

/** Mobile slide-up sheet / desktop scale-fade popover — same responsive Modal animation as BankPickerModal, reused rather than rebuilt. */
export default function AccountPickerModal({
  accounts,
  selectedId,
  onSelect,
  onClose,
}: {
  accounts: LocalBankAccount[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = usePreferences();

  function pick(id: string) {
    onSelect(id);
    onClose();
  }

  return (
    <Modal title={t("bank.toAccount")} onClose={onClose}>
      <div className="flex flex-col gap-1">
        {accounts.map((account) => (
          <OptionRow
            key={account.id}
            account={account}
            selected={account.id === selectedId}
            onClick={() => pick(account.id)}
          />
        ))}
      </div>
    </Modal>
  );
}
