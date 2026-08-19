"use client";

import { useEffect, useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import PhotoAttachment from "@/components/customers/PhotoAttachment";
import { selectClassName } from "@/components/ui/TextField";
import {
  CASH_IN_CATEGORIES,
  CASH_OUT_CATEGORIES,
  EXPENSE_CATEGORIES,
} from "@/lib/constants/cashbookCategories";
import { getFinancialInstitution } from "@/lib/constants/banks";
import { recordCashbookEntry, updateCashbookEntryWithLink } from "@/lib/db/ledger";
import { getBankAccounts, savePhoto, type CashbookEntry, type LocalBankAccount } from "@/lib/db/offlineStorage";
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
  const showToast = useToast();
  const isExpense = existing ? Boolean(existing.is_expense) : mode === "expense";
  const [type, setType] = useState<"IN" | "OUT">(existing?.type ?? (isExpense ? "OUT" : initialType));
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | "wallet">(
    existing?.payment_method ?? "cash"
  );
  const [accountId, setAccountId] = useState(existing?.account_id ?? "");
  const [bankAccounts, setBankAccounts] = useState<LocalBankAccount[]>([]);
  const [dateValue, setDateValue] = useState(() =>
    toDatetimeLocalValue(existing ? new Date(existing.entry_date) : new Date())
  );
  const [photoState, setPhotoState] = useState<PhotoState>(
    existing?.photo_id ? { kind: "existing", id: existing.photo_id } : { kind: "none" }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBankAccounts(userId).then((rows) => setBankAccounts(rows));
  }, [userId]);

  const categoryOptions = isExpense ? EXPENSE_CATEGORIES : type === "IN" ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;
  const title = existing ? (isExpense ? "Edit Expense" : "Edit Cash Entry") : isExpense ? "Add Expense" : "Add Cash Entry";
  const accountOptions = bankAccounts.filter(
    (a) => getFinancialInstitution(a.bank_code)?.category === paymentMethod
  );
  const ctaVariant = isExpense || type === "OUT" ? "warning" : "success";

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

    const selectedAccount =
      isExpense && paymentMethod !== "cash" ? bankAccounts.find((a) => a.id === accountId) : undefined;
    if (isExpense && paymentMethod !== "cash" && !selectedAccount) {
      setError(`Choose which ${paymentMethod} account this was paid from.`);
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
      isExpense,
      paymentMethod: isExpense || type === "OUT" ? paymentMethod : ("cash" as const),
      account: selectedAccount,
      photoId,
      entryDate: fromDatetimeLocalValue(dateValue),
    };

    if (existing) {
      await updateCashbookEntryWithLink(existing, fields);
    } else {
      await recordCashbookEntry(userId, fields);
    }

    setSaving(false);
    showToast(isExpense ? "Expense added" : type === "IN" ? "Cash in recorded" : "Cash out recorded");
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
          <div className="flex flex-col gap-2">
            <SegmentedControl
              label="Payment method"
              value={paymentMethod}
              onChange={(value) => {
                setPaymentMethod(value);
                setAccountId("");
              }}
              options={[
                { value: "cash", label: "Cash" },
                { value: "bank", label: "Bank" },
                { value: "wallet", label: "Wallet" },
              ]}
            />
            {isExpense && paymentMethod !== "cash" && (
              accountOptions.length > 0 ? (
                <select
                  aria-label={`Choose ${paymentMethod} account`}
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">— Choose account —</option>
                  {accountOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_title} ({a.bank_name})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-senior-xs text-ink-secondary">
                  No {paymentMethod} account yet — add one in Bank &amp; Wallet first.
                </p>
              )
            )}
          </div>
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
          placeholder="e.g. Monthly shop rent"
        />

        <PhotoAttachment
          file={photoState.kind === "new" ? photoState.file : null}
          existingPhotoId={photoState.kind === "existing" ? photoState.id : undefined}
          onFileSelected={(file) => setPhotoState({ kind: "new", file })}
          onRemove={() => setPhotoState({ kind: "none" })}
        />

        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-senior-sm font-medium text-danger-dark">
            {error}
          </p>
        )}

        <Button type="submit" variant={ctaVariant} loading={saving} fullWidth>
          {existing ? "Update entry" : "Save entry"}
        </Button>

        {onDelete && (
          <Button variant="danger" fullWidth onClick={onDelete}>
            Delete entry
          </Button>
        )}
      </form>
    </Modal>
  );
}
