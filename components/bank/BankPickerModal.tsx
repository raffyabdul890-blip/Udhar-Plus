"use client";

import Modal from "@/components/ui/Modal";
import Icon from "@/components/icons/Icon";
import BankLogoBadge from "@/components/bank/BankLogoBadge";
import { PAKISTANI_BANKS, PAKISTANI_WALLETS, type FinancialInstitution } from "@/lib/constants/banks";
import { usePreferences } from "@/components/providers/PreferencesProvider";

function OptionRow({
  institution,
  selected,
  onClick,
}: {
  institution: FinancialInstitution;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-tap w-full items-center gap-3 rounded-xl px-2 py-2 text-start transition-colors duration-150 active:scale-[0.99] ${
        selected ? "bg-primary-light" : "hover:bg-surface-alt"
      }`}
    >
      <BankLogoBadge bankCode={institution.code} size="sm" />
      <span className={`min-w-0 flex-1 truncate text-senior-base font-bold ${selected ? "text-primary" : "text-ink"}`}>
        {institution.name}
      </span>
      {selected && <Icon name="check-circle" size={20} className="shrink-0 text-primary" />}
    </button>
  );
}

/** Mobile slide-up sheet / desktop scale-fade popover — both are just Modal's existing responsive animation, reused rather than rebuilt. */
export default function BankPickerModal({
  selectedCode,
  onSelect,
  onClose,
}: {
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const { t } = usePreferences();

  function pick(code: string) {
    onSelect(code);
    onClose();
  }

  return (
    <Modal title={t("bank.chooseBank")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="px-2 pb-1 text-senior-xs font-bold uppercase tracking-wide text-ink-tertiary">
            {t("bank.typeBank")}
          </p>
          {PAKISTANI_BANKS.map((bank) => (
            <OptionRow key={bank.code} institution={bank} selected={bank.code === selectedCode} onClick={() => pick(bank.code)} />
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <p className="px-2 pb-1 text-senior-xs font-bold uppercase tracking-wide text-ink-tertiary">
            {t("bank.typeWallet")}
          </p>
          {PAKISTANI_WALLETS.map((wallet) => (
            <OptionRow key={wallet.code} institution={wallet} selected={wallet.code === selectedCode} onClick={() => pick(wallet.code)} />
          ))}
        </div>
      </div>
    </Modal>
  );
}
