"use client";

import { useState, type SubmitEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import BankSelectField from "@/components/bank/BankSelectField";
import { FINANCIAL_INSTITUTIONS, PAKISTANI_BANKS } from "@/lib/constants/banks";
import { recordBankTransaction } from "@/lib/db/ledger";
import { addBankAccount } from "@/lib/db/offlineStorage";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export default function AddBankAccountModal({
  userId,
  onClose,
  onAdded,
}: {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { t } = usePreferences();
  const showToast = useToast();
  const [bankCode, setBankCode] = useState(PAKISTANI_BANKS[0].code);
  const [accountTitle, setAccountTitle] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected =
    FINANCIAL_INSTITUTIONS.find((institution) => institution.code === bankCode) ??
    PAKISTANI_BANKS[0];

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setError(null);

    if (!accountTitle.trim() || !accountNumber.trim()) {
      setError(t("bank.errorAccountFields"));
      return;
    }

    setSaving(true);
    const account = await addBankAccount({
      user_id: userId,
      bank_name: selected.name,
      bank_code: selected.code,
      account_title: accountTitle.trim(),
      account_number: accountNumber.trim(),
      current_balance: 0,
    });

    const amount = Number(openingBalance) || 0;
    if (amount > 0) {
      // Reuses the existing transaction system — an opening balance is just a
      // first Add Money entry, same pattern as a customer's opening balance.
      // Uses the same minute-truncated "now" convention as every date-field-
      // backed entry (fromDatetimeLocalValue(toDatetimeLocalValue(...)), not a
      // raw full-precision timestamp — otherwise this entry can sort as
      // "later" than a same-minute entry recorded through a form, corrupting
      // history order (see AddCustomerModal's identical fix in Phase 3).
      const openingBalanceDate = fromDatetimeLocalValue(toDatetimeLocalValue(new Date()));
      await recordBankTransaction(account, "IN", amount, "Opening balance", openingBalanceDate);
    }

    setSaving(false);
    showToast(t("toast.accountAdded"));
    onAdded();
    onClose();
  }

  return (
    <Modal
      title={t("bank.addAccount")}
      onClose={onClose}
      footer={
        <Button type="submit" form="add-bank-account-form" loading={saving} fullWidth>
          {t("bank.saveAccount")}
        </Button>
      }
    >
      <form id="add-bank-account-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="rounded-xl border border-primary/20 bg-primary-light px-4 py-3 text-senior-xs text-primary">
          {t("bank.disclaimer")}
        </p>

        <BankSelectField label={t("bank.chooseBank")} value={bankCode} onChange={setBankCode} />

        <TextField
          id="account-title"
          label={t("bank.accountTitle")}
          value={accountTitle}
          onChange={(e) => setAccountTitle(e.target.value)}
          placeholder={t("bank.accountTitlePlaceholder")}
        />
        <TextField
          id="account-number"
          label={t("bank.accountNumber")}
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="03001234567"
          inputMode="numeric"
        />
        <TextField
          id="account-opening-balance"
          label={t("customer.openingBalance")}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
          placeholder="0"
        />

        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-senior-sm font-medium text-danger-dark">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
