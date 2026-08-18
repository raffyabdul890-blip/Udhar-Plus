"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import {
  deleteCustomerTransactionEntry,
  deleteCustomerWithHistory,
  recordCustomerTransaction,
  settleCustomerBalance,
} from "@/lib/db/ledger";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";
import type { LocalCustomer, LocalTransaction } from "@/lib/db/offlineStorage";

type EntryType = "DIYE" | "MILAY" | "SETTLE";
type PendingDelete = { kind: "transaction"; transaction: LocalTransaction } | { kind: "customer" };

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
  transactions,
  onClose,
  onSaved,
  onDeleted,
}: {
  customer: LocalCustomer;
  transactions: LocalTransaction[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [entryType, setEntryType] = useState<EntryType>("DIYE");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dateValue, setDateValue] = useState(() => toDatetimeLocalValue(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const history = [...transactions].sort((a, b) =>
    a.transaction_date < b.transaction_date ? 1 : -1
  );

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

      {history.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-brand-white/10 pt-4">
          <h3 className="text-senior-sm font-bold text-brand-white/80">Recent entries</h3>
          <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {history.map((txn) => (
              <li
                key={txn.id}
                className="flex items-center gap-3 rounded-xl bg-brand-black/40 px-3 py-2"
              >
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span className="truncate text-senior-sm font-medium text-brand-white">
                    {txn.type === "OUT" ? "Diye" : "Milay"} · {txn.amount.toLocaleString("en-PK")}
                  </span>
                  <span className="truncate text-senior-xs text-brand-white/60">
                    {formatDateTime(txn.transaction_date)}
                    {txn.note ? ` · ${txn.note}` : ""}
                  </span>
                </div>
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
    </Modal>
  );
}
