"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import PhotoAttachment from "@/components/customers/PhotoAttachment";
import AccountSelectField from "@/components/bank/AccountSelectField";
import {
  CASH_IN_CATEGORIES,
  CASH_OUT_CATEGORIES,
  EXPENSE_CATEGORIES,
} from "@/lib/constants/cashbookCategories";
import { getFinancialInstitution } from "@/lib/constants/banks";
import { recordCashbookEntry, updateCashbookEntryWithLink } from "@/lib/db/ledger";
import { getBankAccounts, savePhoto, type CashbookEntry, type LocalBankAccount } from "@/lib/db/offlineStorage";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";
import { usePreferences } from "@/components/providers/PreferencesProvider";

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
  const { t } = usePreferences();
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
  const title = existing
    ? isExpense
      ? t("cashbook.editExpense")
      : t("cashbook.editCashEntry")
    : isExpense
      ? t("cashbook.addExpense")
      : t("cashbook.addCashEntry");
  const accountOptions = bankAccounts.filter(
    (a) => getFinancialInstitution(a.bank_code)?.category === paymentMethod
  );
  const ctaVariant = isExpense || type === "OUT" ? "warning" : "success";

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError(t("transaction.errorAmount"));
      return;
    }
    if (!category.trim()) {
      setError(t("cashbook.errorCategory"));
      return;
    }

    const selectedAccount =
      isExpense && paymentMethod !== "cash" ? bankAccounts.find((a) => a.id === accountId) : undefined;
    if (isExpense && paymentMethod !== "cash" && !selectedAccount) {
      setError(t("cashbook.chooseAccountPaidFrom", { method: paymentMethod }));
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
    showToast(isExpense ? t("toast.expenseAdded") : type === "IN" ? t("toast.cashInRecorded") : t("toast.cashOutRecorded"));
    onSaved();
    onClose();
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isExpense && (
          <SegmentedControl
            label={t("cashbook.type")}
            value={type}
            onChange={setType}
            options={[
              { value: "IN", label: t("cashbook.cashIn") },
              { value: "OUT", label: t("cashbook.cashOut") },
            ]}
          />
        )}

        <TextField
          id="cashbook-amount"
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
          id="cashbook-category"
          label={t("cashbook.category")}
          list="cashbook-category-options"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder={isExpense ? t("cashbook.categoryPlaceholderExpense") : t("cashbook.categoryPlaceholderCash")}
        />
        <datalist id="cashbook-category-options">
          {categoryOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        {(isExpense || type === "OUT") && (
          <div className="flex flex-col gap-2">
            <SegmentedControl
              label={t("transaction.paymentMethod")}
              value={paymentMethod}
              onChange={(value) => {
                setPaymentMethod(value);
                setAccountId("");
              }}
              options={[
                { value: "cash", label: t("transaction.cash") },
                { value: "bank", label: t("transaction.bank") },
                { value: "wallet", label: t("transaction.wallet") },
              ]}
            />
            {isExpense && paymentMethod !== "cash" && (
              accountOptions.length > 0 ? (
                <AccountSelectField
                  label={t("cashbook.chooseAccountAria", { method: paymentMethod })}
                  accounts={accountOptions}
                  value={accountId}
                  onChange={setAccountId}
                />
              ) : (
                <p className="text-senior-xs text-ink-secondary">
                  {t("transaction.noAccountYet", { method: paymentMethod })}
                </p>
              )
            )}
          </div>
        )}

        <TextField
          id="cashbook-date"
          label={t("transaction.dateTime")}
          type="datetime-local"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
        />

        <TextField
          id="cashbook-note"
          label={t("common.noteOptional")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("cashbook.notePlaceholder")}
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

        <Button type="submit" variant={ctaVariant} loading={saving} fullWidth className="sticky bottom-0 bg-surface">
          {existing ? t("transaction.updateEntry") : t("cashbook.saveEntry")}
        </Button>

        {onDelete && (
          <Button variant="danger" fullWidth onClick={onDelete}>
            {t("cashbook.deleteEntryButton")}
          </Button>
        )}
      </form>
    </Modal>
  );
}
