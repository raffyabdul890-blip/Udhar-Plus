"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import TransferModal from "@/components/bank/TransferModal";
import {
  deleteBankAccountWithHistory,
  deleteBankTransactionEntry,
  recordBankTransaction,
  updateBankTransactionEntry,
  updateTransferEntry,
} from "@/lib/db/ledger";
import {
  compareTransactionDates,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/utils/datetime";
import {
  getCashbookEntry,
  getTransactionsForEntity,
  type LocalBankAccount,
  type LocalTransaction,
} from "@/lib/db/offlineStorage";

type PendingDelete = { kind: "transaction"; transaction: LocalTransaction } | { kind: "account" };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** True for entries auto-created elsewhere — editing/deleting them here could leave their owning record inconsistent. */
function isBlockedFromDirectEdit(txn: LocalTransaction): boolean {
  return txn.link_kind === "customer_payment_leg" || txn.link_kind === "expense_leg";
}

export default function BankTransactionModal({
  account,
  accounts,
  onClose,
  onSaved,
  onDeleted,
}: {
  account: LocalBankAccount;
  /** All of this shop's accounts, for the Transfer destination picker. */
  accounts: LocalBankAccount[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<LocalTransaction | null>(null);
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dateValue, setDateValue] = useState(() => toDatetimeLocalValue(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [linkLabels, setLinkLabels] = useState<Record<string, string>>({});

  // Scoped to this one account via the [entity_type+entity_id] index, not the
  // whole transactions table — same rationale as CustomerTransactionModal.
  const reloadHistory = useCallback(async () => {
    setTransactions(await getTransactionsForEntity("bank", account.id));
  }, [account.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reloadHistory();
  }, [reloadHistory]);

  const history = [...transactions].sort((a, b) => compareTransactionDates(b, a));

  // Resolve a human-readable label for blocked (linked) entries — "Expense: Electricity"
  // — by looking up the owning Cashbook entry once per render pass, not per keystroke.
  useEffect(() => {
    const expenseLegs = transactions.filter((t) => t.link_kind === "expense_leg" && t.linked_cashbook_entry_id);
    if (expenseLegs.length === 0) return;
    Promise.all(
      expenseLegs.map(async (t) => {
        const entry = t.linked_cashbook_entry_id ? await getCashbookEntry(t.linked_cashbook_entry_id) : undefined;
        return [t.id, entry ? `Expense: ${entry.category}` : "Expense"] as const;
      })
    ).then((pairs) => setLinkLabels(Object.fromEntries(pairs)));
  }, [transactions]);

  function resetForm() {
    setEditingTransaction(null);
    setType("IN");
    setAmount("");
    setNote("");
    setDateValue(toDatetimeLocalValue(new Date()));
    setError(null);
  }

  function startEdit(txn: LocalTransaction) {
    setEditingTransaction(txn);
    setType(txn.type);
    setAmount(String(txn.amount));
    setNote(txn.note ?? "");
    setDateValue(toDatetimeLocalValue(new Date(txn.transaction_date)));
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSaving(true);
    const transactionDate = fromDatetimeLocalValue(dateValue);

    if (editingTransaction?.link_kind === "transfer_leg") {
      // A transfer's direction is fixed by which side it's on — only amount/note/date
      // are editable, and both legs move together so neither side drifts.
      await updateTransferEntry(editingTransaction, parsedAmount, note.trim() || undefined, transactionDate);
    } else if (editingTransaction) {
      await updateBankTransactionEntry(
        account,
        editingTransaction,
        type,
        parsedAmount,
        note.trim() || undefined,
        transactionDate
      );
    } else {
      await recordBankTransaction(account, type, parsedAmount, note.trim() || undefined, transactionDate);
    }

    setSaving(false);
    onSaved();
    await reloadHistory();
    resetForm();
    onClose();
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;

    if (pendingDelete.kind === "transaction") {
      await deleteBankTransactionEntry(account, pendingDelete.transaction);
      setPendingDelete(null);
      onSaved();
      await reloadHistory();
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

        {editingTransaction?.link_kind === "transfer_leg" ? (
          <p className="text-senior-sm text-brand-white/70">
            Transfer {type === "IN" ? "in" : "out"} — editing amount, date, and note only.
          </p>
        ) : (
          <SegmentedControl
            label="Direction"
            value={type}
            onChange={setType}
            options={[
              { value: "IN", label: "Add Money" },
              { value: "OUT", label: "Remove Money" },
            ]}
          />
        )}

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

        {accounts.length > 1 && !editingTransaction && (
          <button
            type="button"
            onClick={() => setShowTransfer(true)}
            className="min-h-tap rounded-xl border border-brand-charcoal px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98]"
          >
            ⇄ Transfer to Another Account
          </button>
        )}
      </form>

      {history.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-brand-white/10 pt-4">
          <h3 className="text-senior-sm font-bold text-brand-white/80">Recent entries</h3>
          <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {history.map((txn) => {
              const blocked = isBlockedFromDirectEdit(txn);
              return (
                <li
                  key={txn.id}
                  className="flex items-center gap-3 rounded-xl bg-brand-black/40 px-3 py-2"
                >
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-senior-sm font-medium text-brand-white">
                      {txn.link_kind === "transfer_leg" ? "Transfer" : `Cash ${txn.type}`} ·{" "}
                      {txn.amount.toLocaleString("en-PK")}
                    </span>
                    <span className="truncate text-senior-xs text-brand-white/60">
                      {formatDateTime(txn.transaction_date)}
                      {txn.note ? ` · ${txn.note}` : ""}
                    </span>
                  </div>
                  {blocked ? (
                    <span className="shrink-0 rounded-full bg-brand-charcoal px-2 py-1 text-senior-xs font-medium text-brand-white/60">
                      {txn.link_kind === "customer_payment_leg"
                        ? "Linked to Customer Payment"
                        : (linkLabels[txn.id] ?? "Linked to Expense")}
                    </span>
                  ) : (
                    <>
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
                    </>
                  )}
                </li>
              );
            })}
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
              : pendingDelete.kind === "transaction" && pendingDelete.transaction.link_kind === "transfer_leg"
                ? "This removes both sides of the transfer and adjusts both balances. This can't be undone."
                : "This removes the entry and adjusts the balance. This can't be undone."
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {showTransfer && (
        <TransferModal
          fromAccount={account}
          accounts={accounts}
          onClose={() => setShowTransfer(false)}
          onSaved={async () => {
            onSaved();
            await reloadHistory();
          }}
        />
      )}
    </Modal>
  );
}
