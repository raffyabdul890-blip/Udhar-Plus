"use client";

import { useCallback, useEffect, useState, type SubmitEvent } from "react";
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
import { usePreferences } from "@/components/providers/PreferencesProvider";

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
  const { t } = usePreferences();
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
    const expenseLegs = transactions.filter((txn) => txn.link_kind === "expense_leg" && txn.linked_cashbook_entry_id);
    if (expenseLegs.length === 0) return;
    Promise.all(
      expenseLegs.map(async (txn) => {
        const entry = txn.linked_cashbook_entry_id ? await getCashbookEntry(txn.linked_cashbook_entry_id) : undefined;
        return [
          txn.id,
          entry ? t("bank.expenseCategoryLabel", { category: entry.category }) : t("dashboard.expense"),
        ] as const;
      })
    ).then((pairs) => setLinkLabels(Object.fromEntries(pairs)));
  }, [transactions, t]);

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

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError(t("transaction.errorAmount"));
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
    showToast(
      editingTransaction ? t("transaction.entryUpdated") : type === "IN" ? t("toast.moneyAdded") : t("toast.moneyRemoved")
    );
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
          <p className="text-senior-sm font-medium text-ink-secondary">{t("bank.currentBalance")}</p>
          <Amount
            value={account.current_balance}
            className={`text-senior-2xl font-bold ${account.current_balance < 0 ? "text-danger" : "text-ink"}`}
          />
        </div>

        {editingTransaction?.link_kind === "transfer_leg" ? (
          <p className="text-senior-sm text-ink-secondary">
            {type === "IN" ? t("bank.editingTransferIn") : t("bank.editingTransferOut")}
          </p>
        ) : (
          <SegmentedControl
            label={t("bank.direction")}
            value={type}
            onChange={setType}
            options={[
              { value: "IN", label: t("bank.addMoney") },
              { value: "OUT", label: t("bank.removeMoney") },
            ]}
          />
        )}

        <TextField
          id="bank-txn-amount"
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
          id="bank-txn-date"
          label={t("transaction.dateTime")}
          type="datetime-local"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
        />

        <TextField
          id="bank-txn-note"
          label={t("common.noteOptional")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("bank.cashDepositPlaceholder")}
        />

        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-senior-sm font-medium text-danger-dark">
            {error}
          </p>
        )}

        <Button type="submit" variant={type === "IN" ? "success" : "warning"} loading={saving} fullWidth className="sticky bottom-0 bg-surface">
          {editingTransaction ? t("transaction.updateEntry") : t("bank.saveEntry")}
        </Button>

        {editingTransaction && (
          <Button variant="ghost" fullWidth onClick={resetForm}>
            {t("transaction.cancelEdit")}
          </Button>
        )}

        {accounts.length > 1 && !editingTransaction && (
          <Button variant="secondary" icon="transfer" fullWidth onClick={() => setShowTransfer(true)}>
            {t("bank.transferToAnotherAccount")}
          </Button>
        )}
      </form>

      {history.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-senior-sm font-bold text-ink-secondary">{t("customer.recentEntries")}</h3>
          <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {history.map((txn) => {
              const blocked = isBlockedFromDirectEdit(txn);
              return (
                <li key={txn.id} className="flex items-center gap-3 rounded-xl bg-surface-alt px-3 py-2">
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-senior-sm font-medium text-ink">
                      {txn.link_kind === "transfer_leg"
                        ? t("bank.transfer")
                        : txn.type === "IN"
                          ? t("cashbook.cashIn")
                          : t("cashbook.cashOut")}{" "}
                      · {txn.amount.toLocaleString("en-PK")}
                    </span>
                    <span className="truncate text-senior-xs text-ink-secondary">
                      {formatDateTime(txn.transaction_date)}
                      {txn.note ? ` · ${txn.note}` : ""}
                    </span>
                  </div>
                  {blocked ? (
                    <Badge>
                      {txn.link_kind === "customer_payment_leg"
                        ? t("bank.linkedToCustomerPayment")
                        : (linkLabels[txn.id] ?? t("bank.linkedToExpense"))}
                    </Badge>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(txn)}
                        aria-label={t("customer.editEntryLabel")}
                        className="flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-xl text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ kind: "transaction", transaction: txn })}
                        aria-label={t("customer.deleteEntryLabel")}
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
        {t("bank.deleteAccount")}
      </Button>

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.kind === "account" ? t("bank.deleteAccountTitle") : t("cashbook.deleteEntryTitle")}
          message={
            pendingDelete.kind === "account"
              ? t("bank.deleteAccountMessage", { account: account.account_title })
              : pendingDelete.kind === "transaction" && pendingDelete.transaction.link_kind === "transfer_leg"
                ? t("bank.deleteTransferMessage")
                : t("customer.deleteEntryMessage")
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
