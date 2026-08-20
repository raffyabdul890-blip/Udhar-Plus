"use client";

import { useState } from "react";
import Icon from "@/components/icons/Icon";
import BankLogoBadge from "@/components/bank/BankLogoBadge";
import BankPickerModal from "@/components/bank/BankPickerModal";
import { getFinancialInstitution } from "@/lib/constants/banks";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export default function BankSelectField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
}) {
  const { t } = usePreferences();
  const [pickerOpen, setPickerOpen] = useState(false);
  const institution = getFinancialInstitution(value);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-senior-base font-medium text-ink">{label}</label>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="flex min-h-tap w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-start transition active:scale-[0.99] hover:bg-surface-alt"
      >
        <BankLogoBadge bankCode={value} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-senior-base font-bold text-ink">{institution?.name ?? value}</p>
          <p className="text-senior-xs text-ink-secondary">
            {institution?.category === "wallet" ? t("bank.typeWallet") : t("bank.typeBank")}
          </p>
        </div>
        <Icon name="chevron-down" size={18} className="shrink-0 text-ink-tertiary" />
      </button>

      {pickerOpen && (
        <BankPickerModal selectedCode={value} onSelect={onChange} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}
