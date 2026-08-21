"use client";

import { useState, type SubmitEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import AccountSelectField from "@/components/bank/AccountSelectField";
import { recordTransfer } from "@/lib/db/ledger";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";
import type { LocalBankAccount } from "@/lib/db/offlineStorage";
import { usePreferences } from "@/components/providers/PreferencesProvider";

/**
 * Records a manual transfer between two of the shopkeeper's own in-app
 * accounts — internal bookkeeping only, never a real bank transfer.
 */
export default function TransferModal({
  fromAccount,
  accounts,
  onClose,
  onSaved,
}: {
  fromAccount: LocalBankAccount;
  accounts: LocalBankAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = usePreferences();
  const showToast = useToast();
  const destinations = accounts.filter((a) => a.id !== fromAccount.id);
  const [toAccountId, setToAccountId] = useState(destinations[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dateValue, setDateValue] = useState(() => toDatetimeLocalValue(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError(t("transaction.errorAmount"));
      return;
    }
    const toAccount = destinations.find((a) => a.id === toAccountId);
    if (!toAccount) {
      setError(t("bank.errorChooseDestination"));
      return;
    }

    setSaving(true);
    await recordTransfer(
      fromAccount,
      toAccount,
      parsedAmount,
      note.trim() || undefined,
      fromDatetimeLocalValue(dateValue)
    );
    setSaving(false);
    showToast(t("toast.transferComplete"));
    onSaved();
    onClose();
  }

  return (
    <Modal
      title={t("bank.transferFrom", { account: fromAccount.account_title })}
      onClose={onClose}
      footer={
        <Button type="submit" form="transfer-form" icon="transfer" loading={saving} fullWidth>
          {t("bank.transfer")}
        </Button>
      }
    >
      <form id="transfer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AccountSelectField
          label={t("bank.toAccount")}
          accounts={destinations}
          value={toAccountId}
          onChange={setToAccountId}
        />

        <TextField
          id="transfer-amount"
          label={t("transaction.amount")}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          autoFocus
        />

        <TextField
          id="transfer-date"
          label={t("transaction.dateTime")}
          type="datetime-local"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
        />

        <TextField
          id="transfer-note"
          label={t("common.noteOptional")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("bank.transferNotePlaceholder")}
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
