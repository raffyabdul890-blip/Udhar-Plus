"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Amount from "@/components/ui/Amount";
import Icon from "@/components/icons/Icon";
import { useToast } from "@/components/ui/ToastProvider";
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
  const showToast = useToast();
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
    showToast(editingTransaction ? "Entry updated" : type === "IN" ? "Money added" : "Money removed");
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
        <div className="rounded-2xl border border-border bg-surface-alt p-5 text-center">
          <p className="text-senior-sm font-medium text-ink-secondary">Current Balance</p>
          <Amount
            value={account.current_balance}
            className={`text-senior-2xl font-bold ${account.current_balance < 0 ? "text-danger" : "text-ink"}`}
          />
        </div>

        {editingTransaction?.link_kind === "transfer_leg" ? (
          <p className="text-senior-sm text-ink-secondary">
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
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-senior-sm font-medium text-danger-dark">
            {error}
          </p>
        )}

        <Button type="submit" variant={type === "IN" ? "success" : "warning"} loading={saving} fullWidth>
          {editingTransaction ? "Update entry" : "Save entry"}
        </Button>

        {editingTransaction && (
          <Button variant="ghost" fullWidth onClick={resetForm}>
            Cancel edit
          </Button>
        )}

        {accounts.length > 1 && !editingTransaction && (
          <Button variant="secondary" icon="transfer" fullWidth onClick={() => setShowTransfer(true)}>
            Transfer to Another Account
          </Button>
        )}
      </form>

      {history.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-senior-sm font-bold text-ink-secondary">Recent entries</h3>
          <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {history.map((txn) => {
              const blocked = isBlockedFromDirectEdit(txn);
              return (
                <li key={txn.id} className="flex items-center gap-3 rounded-xl bg-surface-alt px-3 py-2">
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-senior-sm font-medium text-ink">
                      {txn.link_kind === "transfer_leg" ? "Transfer" : `Cash ${txn.type}`} ·{" "}
                      {txn.amount.toLocaleString("en-PK")}
                    </span>
                    <span className="truncate text-senior-xs text-ink-secondary">
                      {formatDateTime(txn.transaction_date)}
                      {txn.note ? ` · ${txn.note}` : ""}
                    </span>
                  </div>
                  {blocked ? (
                    <Badge>
                      {txn.link_kind === "customer_payment_leg"
                        ? "Linked to Customer Payment"
                        : (linkLabels[txn.id] ?? "Linked to Expense")}
                    </Badge>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(txn)}
                        aria-label="Edit entry"
                        className="flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-xl text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ kind: "transaction", transaction: txn })}
                        aria-label="Delete entry"
                        className="flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-xl text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Button variant="danger" size="sm" onClick={() => setPendingDelete({ kind: "account" })}>
        Delete account
      </Button>

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
