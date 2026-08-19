"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { selectClassName } from "@/components/ui/TextField";
import { recordTransfer } from "@/lib/db/ledger";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";
import type { LocalBankAccount } from "@/lib/db/offlineStorage";

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
  const showToast = useToast();
  const destinations = accounts.filter((a) => a.id !== fromAccount.id);
  const [toAccountId, setToAccountId] = useState(destinations[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dateValue, setDateValue] = useState(() => toDatetimeLocalValue(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    const toAccount = destinations.find((a) => a.id === toAccountId);
    if (!toAccount) {
      setError("Choose which account receives the transfer.");
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
    showToast("Transfer complete");
    onSaved();
    onClose();
  }

  return (
    <Modal title={`Transfer from ${fromAccount.account_title}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="transfer-to" className="text-senior-base font-medium text-ink">
            To account
          </label>
          <select
            id="transfer-to"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            className={selectClassName}
          >
            {destinations.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_title} ({a.bank_name})
              </option>
            ))}
          </select>
        </div>

        <TextField
          id="transfer-amount"
          label="Amount"
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
          label="Date & time"
          type="datetime-local"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
        />

        <TextField
          id="transfer-note"
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Moving float to JazzCash"
        />

        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-senior-sm font-medium text-danger-dark">
            {error}
          </p>
        )}

        <Button type="submit" icon="transfer" loading={saving} fullWidth>
          Transfer
        </Button>
      </form>
    </Modal>
  );
}
