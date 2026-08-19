"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import WhatsAppReminderModal from "@/components/customers/WhatsAppReminderModal";
import ExportSummaryModal from "@/components/customers/ExportSummaryModal";
import ItemizedEntryFields, {
  computeItemsTotal,
} from "@/components/customers/ItemizedEntryFields";
import PhotoAttachment from "@/components/customers/PhotoAttachment";
import EntryPhotoThumbnail from "@/components/customers/EntryPhotoThumbnail";
import {
  deleteCustomerTransactionEntry,
  deleteCustomerWithHistory,
  recordCustomerTransaction,
  settleCustomerBalance,
  updateCustomerTransactionEntry,
} from "@/lib/db/ledger";
import {
  compareTransactionDates,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/utils/datetime";
import { savePhoto, type LineItem, type LocalCustomer, type LocalTransaction } from "@/lib/db/offlineStorage";

type EntryType = "DIYE" | "MILAY" | "SETTLE";
type PendingDelete = { kind: "transaction"; transaction: LocalTransaction } | { kind: "customer" };
type PhotoState = { kind: "none" } | { kind: "new"; file: File } | { kind: "existing"; id: string };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CustomerTransactionModal({
  customer,
  shopLabel,
  transactions,
  onClose,
  onSaved,
  onDeleted,
}: {
  customer: LocalCustomer;
  shopLabel: string;
  transactions: LocalTransaction[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [editingTransaction, setEditingTransaction] = useState<LocalTransaction | null>(null);
  const [entryType, setEntryType] = useState<EntryType>("DIYE");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dateValue, setDateValue] = useState(() => toDatetimeLocalValue(new Date()));
  const [showItems, setShowItems] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [photoState, setPhotoState] = useState<PhotoState>({ kind: "none" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [showExportSummary, setShowExportSummary] = useState(false);

  const history = [...transactions].sort((a, b) => compareTransactionDates(b, a));

  // Items are the source of truth once they have real values — recalculates the
  // amount whenever the item rows change, but never wipes a manually-typed
  // amount just because an empty item row was added. Done in the change handler
  // (not an effect) since this is derived state from an event, not external sync.
  function handleItemsChange(nextItems: LineItem[]) {
    setItems(nextItems);
    const total = computeItemsTotal(nextItems);
    if (total > 0) setAmount(String(total));
  }

  function resetForm() {
    setEditingTransaction(null);
    setEntryType("DIYE");
    setAmount("");
    setNote("");
    setDateValue(toDatetimeLocalValue(new Date()));
    setShowItems(false);
    setItems([]);
    setPhotoState({ kind: "none" });
    setError(null);
  }

  function startEdit(txn: LocalTransaction) {
    setEditingTransaction(txn);
    setEntryType(txn.type === "OUT" ? "DIYE" : "MILAY");
    setAmount(String(txn.amount));
    setNote(txn.note ?? "");
    setDateValue(toDatetimeLocalValue(new Date(txn.transaction_date)));
    setItems(txn.items ?? []);
    setShowItems(Boolean(txn.items?.length));
    setPhotoState(txn.photo_id ? { kind: "existing", id: txn.photo_id } : { kind: "none" });
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const transactionDate = fromDatetimeLocalValue(dateValue);

    if (!editingTransaction && entryType === "SETTLE") {
      if (customer.current_balance === 0) {
        setError("This customer's account is already settled.");
        return;
      }
      setSaving(true);
      await settleCustomerBalance(customer, transactionDate);
      setSaving(false);
      onSaved();
      resetForm();
      onClose();
      return;
    }

    const parsedAmount = Number(amount) || 0;
    if (parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSaving(true);

    let photoId: string | undefined;
    if (photoState.kind === "new") {
      photoId = await savePhoto(customer.user_id, photoState.file);
    } else if (photoState.kind === "existing") {
      photoId = photoState.id;
    }

    const fields = {
      note: note.trim() || undefined,
      items: items.length > 0 ? items : undefined,
      photoId,
    };
    const type = entryType === "DIYE" ? ("OUT" as const) : ("IN" as const);

    if (editingTransaction) {
      await updateCustomerTransactionEntry(
        customer,
        editingTransaction,
        type,
        parsedAmount,
        transactionDate,
        fields
      );
    } else {
      await recordCustomerTransaction(customer, type, parsedAmount, transactionDate, fields);
    }

    setSaving(false);
    onSaved();
    resetForm();
    onClose();
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;

    if (pendingDelete.kind === "transaction") {
      await deleteCustomerTransactionEntry(customer, pendingDelete.transaction);
      setPendingDelete(null);
      onSaved();
      return;
    }

    await deleteCustomerWithHistory(customer, transactions);
    setPendingDelete(null);
    onDeleted();
  }

  return (
    <Modal title={customer.name} onClose={onClose}>
      <div className="flex flex-col gap-3">
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowReminder(true)}
            className="flex min-h-tap flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-brand-charcoal px-3 text-senior-sm font-bold text-brand-white transition active:scale-[0.98]"
          >
            💬 Remind on WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setShowExportSummary(true)}
            className="flex min-h-tap flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-brand-charcoal px-3 text-senior-sm font-bold text-brand-white transition active:scale-[0.98]"
          >
            📄 Share / Export Summary
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <SegmentedControl
          label="Entry type"
          value={entryType}
          onChange={setEntryType}
          options={
            editingTransaction
              ? [
                  { value: "DIYE", label: "Diye" },
                  { value: "MILAY", label: "Milay" },
                ]
              : [
                  { value: "DIYE", label: "Diye" },
                  { value: "MILAY", label: "Milay" },
                  { value: "SETTLE", label: "Hisaab Baraber" },
                ]
          }
        />

        {entryType !== "SETTLE" && (
          <>
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

            {showItems ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-senior-base font-medium text-brand-white">Items</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowItems(false);
                      setItems([]);
                    }}
                    className="text-senior-xs font-medium text-brand-white/60 underline"
                  >
                    Remove items
                  </button>
                </div>
                <ItemizedEntryFields items={items} onChange={handleItemsChange} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowItems(true)}
                className="min-h-tap rounded-xl border border-brand-charcoal px-4 text-senior-sm font-bold text-brand-white transition active:scale-[0.98]"
              >
                🧾 Add Items
              </button>
            )}
          </>
        )}

        <TextField
          id="txn-date"
          label="Date & time"
          type="datetime-local"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
        />

        {entryType !== "SETTLE" && (
          <>
            <TextField
              id="txn-note"
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 2 bags of flour"
            />

            <PhotoAttachment
              file={photoState.kind === "new" ? photoState.file : null}
              existingPhotoId={photoState.kind === "existing" ? photoState.id : undefined}
              onFileSelected={(file) => setPhotoState({ kind: "new", file })}
              onRemove={() => setPhotoState({ kind: "none" })}
            />
          </>
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
          {saving ? "Saving…" : editingTransaction ? "Update entry" : "Save entry"}
        </button>

        {editingTransaction && (
          <button
            type="button"
            onClick={resetForm}
            className="min-h-tap text-senior-sm font-medium text-brand-white/80 underline"
          >
            Cancel edit
          </button>
        )}
      </form>

      {history.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-brand-white/10 pt-4">
          <h3 className="text-senior-sm font-bold text-brand-white/80">Recent entries</h3>
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {history.map((txn) => (
              <li
                key={txn.id}
                className="flex items-center gap-3 rounded-xl bg-brand-black/40 px-3 py-2"
              >
                {txn.photo_id && <EntryPhotoThumbnail photoId={txn.photo_id} />}
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span
                    className={`truncate text-senior-sm font-bold ${
                      txn.type === "OUT" ? "text-brand-red" : "text-brand-green"
                    }`}
                  >
                    {txn.type === "OUT" ? "Udhar (Diye)" : "Jama (Milay)"} ·{" "}
                    {txn.amount.toLocaleString("en-PK")}
                  </span>
                  <span className="truncate text-senior-xs text-brand-white/60">
                    {formatDateTime(txn.transaction_date)}
                    {txn.note ? ` · ${txn.note}` : ""}
                  </span>
                  {txn.items && txn.items.length > 0 && (
                    <span className="truncate text-senior-xs text-brand-white/50">
                      {txn.items.length} item{txn.items.length > 1 ? "s" : ""}:{" "}
                      {txn.items.map((item) => item.name || "—").join(", ")}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(txn)}
                  aria-label="Edit entry"
                  className="flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-xl text-senior-base text-brand-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete({ kind: "transaction", transaction: txn })}
                  aria-label="Delete entry"
                  className="flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-xl text-senior-base text-brand-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setPendingDelete({ kind: "customer" })}
        className="min-h-tap min-w-tap rounded-xl border border-brand-red px-6 text-senior-base font-bold text-brand-red transition active:scale-[0.98]"
      >
        Delete customer
      </button>

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.kind === "customer" ? "Delete customer?" : "Delete entry?"}
          message={
            pendingDelete.kind === "customer"
              ? `This removes ${customer.name} and their entire transaction history. This can't be undone.`
              : "This removes the entry and adjusts the balance. This can't be undone."
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {showReminder && (
        <WhatsAppReminderModal
          customer={customer}
          onClose={() => setShowReminder(false)}
          onSaved={onSaved}
        />
      )}

      {showExportSummary && (
        <ExportSummaryModal
          customer={customer}
          shopLabel={shopLabel}
          transactions={transactions}
          onClose={() => setShowExportSummary(false)}
        />
      )}
    </Modal>
  );
}
