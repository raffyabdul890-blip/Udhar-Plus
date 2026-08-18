"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { recordBankTransaction } from "@/lib/db/ledger";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";
import type { LocalBankAccount } from "@/lib/db/offlineStorage";

export default function BankTransactionModal({
  account,
  onClose,
  onSaved,
}: {
  account: LocalBankAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"IN" | "OUT">("IN");
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

    setSaving(true);
    await recordBankTransaction(
      account,
      type,
      parsedAmount,
      note.trim() || undefined,
      fromDatetimeLocalValue(dateValue)
    );
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title={account.account_title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-senior-sm text-brand-white/70">
          Current balance:{" "}
          <span
            className={
              account.current_balance < 0
                ? "font-bold text-brand-red"
                : "font-bold text-brand-white"
            }
          >
            {account.current_balance.toLocaleString("en-PK")}
          </span>
        </p>

        <SegmentedControl
          label="Cash direction"
          value={type}
          onChange={setType}
          options={[
            { value: "IN", label: "Cash IN" },
            { value: "OUT", label: "Cash OUT" },
          ]}
        />

        <TextField
          id="bank-txn-amount"
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
          id="bank-txn-date"
          label="Date & time"
          type="datetime-local"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
        />

        <TextField
          id="bank-txn-note"
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Cash deposit"
        />

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-brand-red bg-brand-charcoal px-4 py-3 text-senior-sm font-medium text-brand-white"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred disabled:bg-brand-charcoal disabled:text-brand-white/50"
        >
          {saving ? "Saving…" : "Save entry"}
        </button>
      </form>
    </Modal>
  );
}
