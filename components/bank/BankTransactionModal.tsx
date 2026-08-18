"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import {
  deleteBankAccountWithHistory,
  deleteBankTransactionEntry,
  recordBankTransaction,
} from "@/lib/db/ledger";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";
import type { LocalBankAccount, LocalTransaction } from "@/lib/db/offlineStorage";

type PendingDelete = { kind: "transaction"; transaction: LocalTransaction } | { kind: "account" };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BankTransactionModal({
  account,
  transactions,
  onClose,
  onSaved,
  onDeleted,
}: {
  account: LocalBankAccount;
  transactions: LocalTransaction[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [type, setType] = useState<"IN" | "OUT">("IN");
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

  async function handleConfirmDelete() {
    if (!pendingDelete) return;

    if (pendingDelete.kind === "transaction") {
      await deleteBankTransactionEntry(account, pendingDelete.transaction);
      setPendingDelete(null);
      onSaved();
      return;
    }

    await deleteBankAccountWithHistory(account, transactions);
    setPendingDelete(null);
    onDeleted();
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
                    Cash {txn.type} · {txn.amount.toLocaleString("en-PK")}
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
        onClick={() => setPendingDelete({ kind: "account" })}
        className="min-h-tap min-w-tap rounded-xl border border-brand-red px-6 text-senior-base font-bold text-brand-red transition active:scale-[0.98]"
      >
        Delete account
      </button>

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.kind === "account" ? "Delete account?" : "Delete entry?"}
          message={
            pendingDelete.kind === "account"
              ? `This removes ${account.account_title} and its entire transaction history. This can't be undone.`
              : "This removes the entry and adjusts the balance. This can't be undone."
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </Modal>
  );
}
