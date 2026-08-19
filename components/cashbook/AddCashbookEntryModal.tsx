"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import PhotoAttachment from "@/components/customers/PhotoAttachment";
import {
  CASH_IN_CATEGORIES,
  CASH_OUT_CATEGORIES,
  EXPENSE_CATEGORIES,
} from "@/lib/constants/cashbookCategories";
import {
  addCashbookEntry,
  savePhoto,
  updateCashbookEntry,
  type CashbookEntry,
} from "@/lib/db/offlineStorage";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";

type PhotoState = { kind: "none" } | { kind: "new"; file: File } | { kind: "existing"; id: string };

export default function AddCashbookEntryModal({
  userId,
  /** "expense" pre-selects Cash OUT with expense categories + payment method; "cash" is plain Cash In/Out. */
  mode,
  /** Pre-selects Cash IN vs OUT for a new (non-expense) entry — ignored once editing. */
  initialType = "IN",
  existing,
  onClose,
  onSaved,
  onDelete,
}: {
  userId: string;
  mode: "cash" | "expense";
  initialType?: "IN" | "OUT";
  existing?: CashbookEntry;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => void;
}) {
  const isExpense = existing ? Boolean(existing.is_expense) : mode === "expense";
  const [type, setType] = useState<"IN" | "OUT">(existing?.type ?? (isExpense ? "OUT" : initialType));
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | "wallet">(
    existing?.payment_method ?? "cash"
  );
  const [dateValue, setDateValue] = useState(() =>
    toDatetimeLocalValue(existing ? new Date(existing.entry_date) : new Date())
  );
  const [photoState, setPhotoState] = useState<PhotoState>(
    existing?.photo_id ? { kind: "existing", id: existing.photo_id } : { kind: "none" }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = isExpense ? EXPENSE_CATEGORIES : type === "IN" ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;
  const title = existing ? (isExpense ? "Edit Expense" : "Edit Cash Entry") : isExpense ? "Add Expense" : "Add Cash Entry";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!category.trim()) {
      setError("Choose or enter a category.");
      return;
    }

    setSaving(true);

    let photoId: string | undefined;
    if (photoState.kind === "new") {
      photoId = await savePhoto(userId, photoState.file);
    } else if (photoState.kind === "existing") {
      photoId = photoState.id;
    }

    const fields = {
      type,
      amount: parsedAmount,
      category: category.trim(),
      note: note.trim() || undefined,
      is_expense: isExpense,
      payment_method: isExpense || type === "OUT" ? paymentMethod : "cash",
      photo_id: photoId,
      entry_date: fromDatetimeLocalValue(dateValue),
    } as const;

    if (existing) {
      await updateCashbookEntry(existing.id, fields);
    } else {
      await addCashbookEntry({ user_id: userId, ...fields });
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isExpense && (
          <SegmentedControl
            label="Type"
            value={type}
            onChange={setType}
            options={[
              { value: "IN", label: "Cash IN" },
              { value: "OUT", label: "Cash OUT" },
            ]}
          />
        )}

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
          list="cashbook-category-options"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder={isExpense ? "e.g. Rent" : "e.g. Sale, Rent, Salary"}
        />
        <datalist id="cashbook-category-options">
          {categoryOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        {(isExpense || type === "OUT") && (
          <SegmentedControl
            label="Payment method"
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={[
              { value: "cash", label: "Cash" },
              { value: "bank", label: "Bank" },
              { value: "wallet", label: "Wallet" },
            ]}
          />
        )}

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
          placeholder={isExpense ? "e.g. August electricity bill" : "e.g. Daily sales collection"}
        />

        {isExpense && (
          <PhotoAttachment
            file={photoState.kind === "new" ? photoState.file : null}
            existingPhotoId={photoState.kind === "existing" ? photoState.id : undefined}
            onFileSelected={(file) => setPhotoState({ kind: "new", file })}
            onRemove={() => setPhotoState({ kind: "none" })}
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
          {saving ? "Saving…" : existing ? "Update entry" : "Save entry"}
        </button>

        {existing && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="min-h-tap min-w-tap rounded-xl border border-brand-red px-6 text-senior-base font-bold text-brand-red transition active:scale-[0.98]"
          >
            Delete entry
          </button>
        )}
      </form>
    </Modal>
  );
}
