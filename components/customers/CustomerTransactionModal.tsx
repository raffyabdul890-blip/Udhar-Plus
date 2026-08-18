"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { recordCustomerTransaction, settleCustomerBalance } from "@/lib/db/ledger";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";
import type { LocalCustomer } from "@/lib/db/offlineStorage";

type EntryType = "DIYE" | "MILAY" | "SETTLE";

export default function CustomerTransactionModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: LocalCustomer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [entryType, setEntryType] = useState<EntryType>("DIYE");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dateValue, setDateValue] = useState(() => toDatetimeLocalValue(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const transactionDate = fromDatetimeLocalValue(dateValue);

    if (entryType === "SETTLE") {
      if (customer.current_balance === 0) {
        setError("This customer's account is already settled.");
        return;
      }
      setSaving(true);
      await settleCustomerBalance(customer, transactionDate);
      setSaving(false);
      onSaved();
      onClose();
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSaving(true);
    await recordCustomerTransaction(
      customer,
      entryType === "DIYE" ? "OUT" : "IN",
      parsedAmount,
      note.trim() || undefined,
      transactionDate
    );
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title={customer.name} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-senior-sm text-brand-white/70">
          Current balance:{" "}
          <span
            className={
              customer.current_balance !== 0
                ? "font-bold text-brand-red"
                : "font-bold text-brand-white"
            }
          >
            {customer.current_balance.toLocaleString("en-PK")}
          </span>
        </p>

        <SegmentedControl
          label="Entry type"
          value={entryType}
          onChange={setEntryType}
          options={[
            { value: "DIYE", label: "Diye" },
            { value: "MILAY", label: "Milay" },
            { value: "SETTLE", label: "Hisaab Baraber" },
          ]}
        />

        {entryType !== "SETTLE" && (
          <TextField
            id="txn-amount"
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
        )}

        <TextField
          id="txn-date"
          label="Date & time"
          type="datetime-local"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
        />

        {entryType !== "SETTLE" && (
          <TextField
            id="txn-note"
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. 2 bags of flour"
          />
        )}

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
