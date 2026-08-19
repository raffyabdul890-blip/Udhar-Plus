"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { addCashbookEntry } from "@/lib/db/offlineStorage";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";

export default function AddCashbookEntryModal({
  userId,
  onClose,
  onAdded,
}: {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
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
    if (!category.trim()) {
      setError("Enter a category, e.g. Sales, Rent, Utilities.");
      return;
    }

    setSaving(true);
    await addCashbookEntry({
      user_id: userId,
      type,
      amount: parsedAmount,
      category: category.trim(),
      note: note.trim() || undefined,
      entry_date: fromDatetimeLocalValue(dateValue),
    });
    setSaving(false);
    onAdded();
    onClose();
  }

  return (
    <Modal title="Add Cash Entry" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <SegmentedControl
          label="Type"
          value={type}
          onChange={setType}
          options={[
            { value: "IN", label: "Cash IN" },
            { value: "OUT", label: "Cash OUT" },
          ]}
        />

        <TextField
          id="cashbook-amount"
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
          id="cashbook-category"
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Sales, Rent, Utilities, Salary"
        />

        <TextField
          id="cashbook-date"
          label="Date & time"
          type="datetime-local"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
        />

        <TextField
          id="cashbook-note"
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Daily sales collection"
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
