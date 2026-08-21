"use client";

import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Button from "@/components/ui/Button";
import Amount from "@/components/ui/Amount";
import AvatarInitial from "@/components/ui/AvatarInitial";
import Icon from "@/components/icons/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import WhatsAppReminderModal from "@/components/customers/WhatsAppReminderModal";
import ExportSummaryModal from "@/components/customers/ExportSummaryModal";
import AddCustomerModal from "@/components/customers/AddCustomerModal";
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
import { buildLedgerRows } from "@/lib/ledgerRows";
import { downloadCanvasAsPng, renderBillCanvas } from "@/lib/canvasBill";
import { buildItemizedReceiptMessage, buildReminderMessage } from "@/lib/whatsapp";
import { getFinancialInstitution } from "@/lib/constants/banks";
import { selectClassName } from "@/components/ui/TextField";
import {
  getBankAccounts,
  getItems,
  getTransactionsForEntity,
  savePhoto,
  type LineItem,
  type LocalBankAccount,
  type LocalCustomer,
  type LocalItem,
  type LocalTransaction,
} from "@/lib/db/offlineStorage";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export type EntryType = "DIYE" | "MILAY" | "SETTLE";
type Stage = "choose" | "form";
type PendingDelete = { kind: "transaction"; transaction: LocalTransaction } | { kind: "customer" };
type PhotoState = { kind: "none" } | { kind: "new"; file: File } | { kind: "existing"; id: string };
type ReceiptState = {
  items: LineItem[];
  total: number;
  type: "IN" | "OUT";
  balanceAfter: number;
} | null;
type SavedEntryState = { type: "IN" | "OUT"; amount: number; balanceAfter: number } | null;

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
  initialEntryType,
  initialShowItems,
  onClose,
  onSaved,
  onDeleted,
}: {
  customer: LocalCustomer;
  shopLabel: string;
  /** Pre-selects Give Udhaar / Receive Payment when opened from a quick-action shortcut — also skips straight to the dedicated entry form, hiding the customer-detail chrome. */
  initialEntryType?: EntryType;
  /** Pre-opens the items panel — used by the "+ Sale" quick action. */
  initialShowItems?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { t } = usePreferences();
  const showToast = useToast();
  const isQuickAction = Boolean(initialEntryType);
  const [stage, setStage] = useState<Stage>(isQuickAction ? "form" : "choose");
  const [history, setHistory] = useState<LocalTransaction[]>([]);
  const [catalogItems, setCatalogItems] = useState<LocalItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<LocalBankAccount[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<LocalTransaction | null>(null);
  const [entryType, setEntryType] = useState<EntryType>(initialEntryType ?? "DIYE");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | "wallet">("cash");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [dateValue, setDateValue] = useState(() => toDatetimeLocalValue(new Date()));
  const [showItems, setShowItems] = useState(Boolean(initialShowItems));
  const [items, setItems] = useState<LineItem[]>([]);
  const [photoState, setPhotoState] = useState<PhotoState>({ kind: "none" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [showExportSummary, setShowExportSummary] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptState>(null);
  const [showReceiptWhatsApp, setShowReceiptWhatsApp] = useState(false);
  const [savedEntry, setSavedEntry] = useState<SavedEntryState>(null);
  const [showSavedEntryWhatsApp, setShowSavedEntryWhatsApp] = useState(false);

  // Scoped to this one customer via the [entity_type+entity_id] index — not the
  // whole transactions table — so opening this modal stays fast regardless of
  // how much history the rest of the shop has accumulated.
  const reloadHistory = useCallback(async () => {
    setHistory(await getTransactionsForEntity("customer", customer.id));
  }, [customer.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reloadHistory();
    getItems(customer.user_id).then((rows) => setCatalogItems(rows));
    getBankAccounts(customer.user_id).then((rows) => setBankAccounts(rows));
  }, [reloadHistory, customer.user_id]);

  const accountOptions = bankAccounts.filter(
    (a) => getFinancialInstitution(a.bank_code)?.category === paymentMethod
  );

  const sortedHistory = [...history].sort((a, b) => compareTransactionDates(b, a));

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
    setEntryType(initialEntryType ?? "DIYE");
    setAmount("");
    setNote("");
    setDateValue(toDatetimeLocalValue(new Date()));
    setShowItems(Boolean(initialShowItems));
    setItems([]);
    setPhotoState({ kind: "none" });
    setPaymentMethod("cash");
    setPaymentAccountId("");
    setError(null);
    if (!isQuickAction) setStage("choose");
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
    setPaymentMethod(txn.payment_method ?? "cash");
    setPaymentAccountId(txn.payment_account_id ?? "");
    setError(null);
    setStage("form");
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setError(null);
    const transactionDate = fromDatetimeLocalValue(dateValue);

    if (!editingTransaction && entryType === "SETTLE") {
      if (customer.current_balance === 0) {
        setError(t("customer.alreadySettled"));
        return;
      }
      setSaving(true);
      await settleCustomerBalance(customer, transactionDate);
      setSaving(false);
      showToast(t("transaction.balanceSettled"));
      onSaved();
      resetForm();
      await reloadHistory();
      onClose();
      return;
    }

    const parsedAmount = Number(amount) || 0;
    if (parsedAmount <= 0) {
      setError(t("transaction.errorAmount"));
      return;
    }

    const selectedAccount =
      entryType === "MILAY" && paymentMethod !== "cash"
        ? bankAccounts.find((a) => a.id === paymentAccountId)
        : undefined;
    if (entryType === "MILAY" && paymentMethod !== "cash" && !selectedAccount) {
      setError(
        t("transaction.chooseAccountMethod", {
          method: t(paymentMethod === "bank" ? "transaction.bank" : "transaction.wallet"),
        })
      );
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
      paymentMethod: entryType === "MILAY" ? paymentMethod : undefined,
      paymentAccount: selectedAccount,
    };
    const type = entryType === "DIYE" ? ("OUT" as const) : ("IN" as const);
    const wasNewItemizedEntry = !editingTransaction && items.length > 0;
    const wasEditing = Boolean(editingTransaction);

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
    await reloadHistory();

    if (wasNewItemizedEntry) {
      const balanceAfter =
        type === "OUT" ? customer.current_balance + parsedAmount : customer.current_balance - parsedAmount;
      setReceipt({ items, total: parsedAmount, type, balanceAfter });
      resetForm();
      return;
    }

    if (!wasEditing) {
      const balanceAfter =
        type === "OUT" ? customer.current_balance + parsedAmount : customer.current_balance - parsedAmount;
      setSavedEntry({ type, amount: parsedAmount, balanceAfter });
      resetForm();
      return;
    }

    showToast(t("transaction.entryUpdated"));
    resetForm();
    onClose();
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;

    if (pendingDelete.kind === "transaction") {
      await deleteCustomerTransactionEntry(customer, pendingDelete.transaction);
      setPendingDelete(null);
      onSaved();
      await reloadHistory();
      return;
    }

    await deleteCustomerWithHistory(customer, history);
    setPendingDelete(null);
    onDeleted();
  }

  function handleDownloadReceiptBill() {
    if (!receipt) return;
    const syntheticTxn: LocalTransaction = {
      id: crypto.randomUUID(),
      user_id: customer.user_id,
      entity_type: "customer",
      entity_id: customer.id,
      type: receipt.type,
      amount: receipt.total,
      items: receipt.items,
      transaction_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      synced: true,
    };
    const canvas = renderBillCanvas({
      shopLabel,
      customerName: customer.name,
      customerPhone: customer.phone,
      rows: buildLedgerRows([syntheticTxn]),
      netBalance: receipt.balanceAfter,
    });
    downloadCanvasAsPng(canvas, `${customer.name.replace(/\s+/g, "-")}-bill.png`);
  }

  if (receipt) {
    return (
      <Modal
        title={t("transaction.billSaved")}
        onClose={() => {
          setReceipt(null);
          onClose();
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface-alt p-4">
            {receipt.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-senior-sm text-ink">
                <span className="truncate">
                  {item.name || t("transaction.item")} x{item.quantity}
                  {item.unit ? ` ${item.unit}` : ""}
                </span>
                <span className="shrink-0">
                  {(item.quantity * item.pricePerUnit).toLocaleString("en-PK")}
                </span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-senior-base font-bold text-ink">
              <span>{t("transaction.total")}</span>
              <span>{receipt.total.toLocaleString("en-PK")}</span>
            </div>
          </div>

          <Button
            variant="success"
            icon="whatsapp"
            fullWidth
            onClick={() => setShowReceiptWhatsApp(true)}
            disabled={!customer.phone}
          >
            {t("transaction.shareViaWhatsApp")}
          </Button>
          {!customer.phone && (
            <p className="text-senior-xs text-ink-secondary">{t("transaction.addPhoneForBill")}</p>
          )}

          <Button variant="secondary" icon="download" fullWidth onClick={handleDownloadReceiptBill}>
            {t("transaction.downloadBill")}
          </Button>

          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setReceipt(null);
              onClose();
            }}
          >
            {t("common.done")}
          </Button>
        </div>

        {showReceiptWhatsApp && (
          <WhatsAppReminderModal
            customer={customer}
            title={t("transaction.shareBillWith", { name: customer.name })}
            presetMessage={buildItemizedReceiptMessage(
              customer.name,
              receipt.items,
              receipt.total,
              receipt.balanceAfter
            )}
            onClose={() => {
              setShowReceiptWhatsApp(false);
              setReceipt(null);
              onClose();
            }}
            onSaved={onSaved}
          />
        )}
      </Modal>
    );
  }

  if (savedEntry) {
    const isGiven = savedEntry.type === "OUT";
    const balanceMessage =
      savedEntry.balanceAfter > 0
        ? t("transaction.balanceUpdatedOwes", {
            name: customer.name,
            amount: savedEntry.balanceAfter.toLocaleString("en-PK"),
          })
        : savedEntry.balanceAfter < 0
          ? t("transaction.balanceUpdatedOwed", {
              name: customer.name,
              amount: Math.abs(savedEntry.balanceAfter).toLocaleString("en-PK"),
            })
          : t("transaction.balanceUpdatedSettled", { name: customer.name });
    return (
      <Modal title={isGiven ? t("transaction.udhaarSaved") : t("transaction.paymentReceived")} onClose={onClose}>
        <div className="flex animate-fade-in-up flex-col items-center gap-4 text-center">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              isGiven ? "bg-warning-light text-warning" : "bg-success-light text-success-dark"
            }`}
          >
            <Icon name="check-circle" size={30} />
          </span>
          <Amount
            value={savedEntry.amount}
            className={`text-senior-3xl font-bold ${isGiven ? "text-warning" : "text-success-dark"}`}
          />
          <p className="text-senior-sm text-ink-secondary">{balanceMessage}</p>

          <div className="flex w-full flex-col gap-3">
            <Button
              variant="success"
              icon="whatsapp"
              fullWidth
              onClick={() => setShowSavedEntryWhatsApp(true)}
              disabled={!customer.phone}
            >
              {t("transaction.sendWhatsApp")}
            </Button>
            {!customer.phone && (
              <p className="text-senior-xs text-ink-secondary">{t("transaction.addPhoneForWhatsApp")}</p>
            )}
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setSavedEntry(null);
                onClose();
              }}
            >
              {t("common.done")}
            </Button>
          </div>
        </div>

        {showSavedEntryWhatsApp && (
          <WhatsAppReminderModal
            customer={customer}
            presetMessage={buildReminderMessage(customer.name, savedEntry.balanceAfter)}
            onClose={() => {
              setShowSavedEntryWhatsApp(false);
              setSavedEntry(null);
              onClose();
            }}
            onSaved={onSaved}
          />
        )}
      </Modal>
    );
  }

  const bannerClasses =
    entryType === "MILAY"
      ? "bg-success text-white"
      : entryType === "SETTLE"
        ? "bg-primary text-white"
        : "bg-warning text-white";
  const bannerLabel =
    entryType === "MILAY"
      ? t("transaction.receivePaymentFrom")
      : entryType === "SETTLE"
        ? t("transaction.settleBalanceWith")
        : t("transaction.giveUdhaarTo");
  const canGoBack = !isQuickAction && !editingTransaction;

  return (
    <Modal
      title={customer.name}
      onClose={onClose}
      hideTitle
      footer={
        stage === "form" ? (
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              form="customer-txn-form"
              variant={entryType === "MILAY" ? "success" : entryType === "SETTLE" ? "primary" : "warning"}
              loading={saving}
              fullWidth
            >
              {editingTransaction
                ? t("transaction.updateEntry")
                : entryType === "DIYE"
                  ? t("transaction.saveUdhaar")
                  : entryType === "MILAY"
                    ? t("transaction.savePayment")
                    : t("transaction.confirmSettle")}
            </Button>

            {editingTransaction && (
              <Button variant="ghost" fullWidth onClick={resetForm}>
                {t("transaction.cancelEdit")}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {stage === "choose" ? (
        <div className="flex animate-fade-in-up flex-col gap-5">
          <div className="flex items-center gap-3">
            <AvatarInitial name={customer.name} size="lg" />
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-senior-lg font-bold text-ink">{customer.name}</p>
              {customer.phone && (
                <p className="truncate text-senior-sm text-ink-secondary">{customer.phone}</p>
              )}
            </div>
          </div>

          <div
            className={`rounded-2xl border p-5 text-center ${
              customer.current_balance > 0
                ? "border-danger/10 bg-danger-light"
                : customer.current_balance < 0
                  ? "border-success/10 bg-success-light"
                  : "border-border bg-surface-alt"
            }`}
          >
            <p className="text-senior-sm font-medium text-ink-secondary">
              {customer.current_balance > 0
                ? t("customer.youWillReceive")
                : customer.current_balance < 0
                  ? t("customer.youWillPay")
                  : t("customer.settled")}
            </p>
            <Amount
              value={Math.abs(customer.current_balance)}
              className={`text-senior-3xl font-bold ${
                customer.current_balance > 0
                  ? "text-danger"
                  : customer.current_balance < 0
                    ? "text-success-dark"
                    : "text-ink"
              }`}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon="whatsapp" className="flex-1" onClick={() => setShowReminder(true)}>
              {t("customer.remind")}
            </Button>
            <Button variant="ghost" size="sm" icon="file-text" className="flex-1" onClick={() => setShowExportSummary(true)}>
              {t("customer.export")}
            </Button>
            <Button variant="ghost" size="sm" icon="edit" className="flex-1" onClick={() => setShowEditCustomer(true)}>
              {t("common.edit")}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="warning"
              icon="khata"
              onClick={() => {
                setEntryType("DIYE");
                setStage("form");
              }}
            >
              {t("customer.giveUdhaar")}
            </Button>
            <Button
              variant="success"
              icon="cash-in"
              onClick={() => {
                setEntryType("MILAY");
                setStage("form");
              }}
            >
              {t("customer.receivePayment")}
            </Button>
          </div>

          {customer.current_balance !== 0 && (
            <button
              type="button"
              onClick={() => {
                setEntryType("SETTLE");
                setStage("form");
              }}
              className="text-center text-senior-sm font-bold text-primary underline underline-offset-2"
            >
              {t("customer.settleFullBalance")}
            </button>
          )}

          {sortedHistory.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <h3 className="text-senior-sm font-bold text-ink-secondary">{t("customer.recentEntries")}</h3>
              <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                {sortedHistory.map((txn) => (
                  <li key={txn.id} className="flex items-center gap-3 rounded-xl bg-surface-alt px-3 py-2">
                    {txn.photo_id && <EntryPhotoThumbnail photoId={txn.photo_id} />}
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span
                        className={`truncate text-senior-sm font-bold ${
                          txn.type === "OUT" ? "text-danger" : "text-success-dark"
                        }`}
                      >
                        {txn.type === "OUT" ? t("customer.udhaarDiye") : t("customer.jamaMilay")} ·{" "}
                        {txn.amount.toLocaleString("en-PK")}
                      </span>
                      <span className="truncate text-senior-xs text-ink-secondary">
                        {formatDateTime(txn.transaction_date)}
                        {txn.note ? ` · ${txn.note}` : ""}
                      </span>
                      {txn.items && txn.items.length > 0 && (
                        <span className="truncate text-senior-xs text-ink-tertiary">
                          {t(txn.items.length === 1 ? "customer.itemsCount" : "customer.itemsCountPlural", {
                            count: txn.items.length,
                          })}
                          : {txn.items.map((item) => item.name || "—").join(", ")}
                        </span>
                      )}
                    </div>
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
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="danger" size="sm" onClick={() => setPendingDelete({ kind: "customer" })}>
            {t("customer.deleteCustomer")}
          </Button>
        </div>
      ) : (
        <form id="customer-txn-form" onSubmit={handleSubmit} className="flex animate-fade-in-up flex-col gap-4">
          <div className={`-m-6 mb-0 flex flex-col gap-1 rounded-t-2xl px-6 pb-5 pt-6 ${bannerClasses}`}>
            {canGoBack && (
              <button
                type="button"
                onClick={resetForm}
                className="mb-1 flex items-center gap-1 self-start text-senior-sm font-bold opacity-90"
              >
                <Icon name="chevron-left" size={18} />
                {t("transaction.back")}
              </button>
            )}
            <p className="text-senior-sm font-medium opacity-85">{bannerLabel}</p>
            <p className="truncate text-senior-xl font-bold">{customer.name}</p>
          </div>

          {editingTransaction && (
            <SegmentedControl
              label={t("transaction.entryType")}
              value={entryType}
              onChange={setEntryType}
              options={[
                { value: "DIYE", label: t("transaction.udhaarGive") },
                { value: "MILAY", label: t("transaction.paymentReceive") },
              ]}
            />
          )}

          {entryType !== "SETTLE" && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="txn-amount" className="text-senior-base font-medium text-ink">
                  {t("transaction.amount")}
                </label>
                <div className="flex min-h-tap items-center gap-2 rounded-xl border border-border bg-surface px-4 focus-within:border-primary focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
                  <span className="text-senior-lg font-bold text-ink-tertiary">Rs.</span>
                  <input
                    id="txn-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className="min-h-tap min-w-0 flex-1 appearance-none bg-transparent text-senior-2xl font-bold text-ink outline-none placeholder:text-ink-tertiary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {showItems ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-senior-base font-medium text-ink">{t("transaction.items")}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowItems(false);
                        setItems([]);
                      }}
                      className="text-senior-xs font-medium text-ink-secondary underline"
                    >
                      {t("transaction.removeItems")}
                    </button>
                  </div>
                  <ItemizedEntryFields items={items} catalogItems={catalogItems} onChange={handleItemsChange} />
                </div>
              ) : (
                <Button variant="secondary" size="sm" icon="receipt" onClick={() => setShowItems(true)}>
                  {t("transaction.addItems")}
                </Button>
              )}
            </>
          )}

          {entryType === "MILAY" && (
            <div className="flex flex-col gap-2">
              <SegmentedControl
                label={t("transaction.paymentMethod")}
                value={paymentMethod}
                onChange={(value) => {
                  setPaymentMethod(value);
                  setPaymentAccountId("");
                }}
                options={[
                  { value: "cash", label: t("transaction.cash") },
                  { value: "bank", label: t("transaction.bank") },
                  { value: "wallet", label: t("transaction.wallet") },
                ]}
              />
              {paymentMethod !== "cash" && (
                accountOptions.length > 0 ? (
                  <select
                    aria-label={t("bank.accountType")}
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">{t("transaction.chooseAccount")}</option>
                    {accountOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_title} ({a.bank_name})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-senior-xs text-ink-secondary">
                    {t("transaction.noAccountYet", { method: t(`transaction.${paymentMethod}`) })}
                  </p>
                )
              )}
            </div>
          )}

          <TextField
            id="txn-date"
            label={t("transaction.dateTime")}
            type="datetime-local"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
          />

          {entryType !== "SETTLE" && (
            <>
              <TextField
                id="txn-note"
                label={t("transaction.description")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("transaction.descriptionPlaceholder")}
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
            <p role="alert" className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-senior-sm font-medium text-danger-dark">
              {error}
            </p>
          )}
        </form>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.kind === "customer" ? t("customer.deleteCustomerTitle") : t("customer.deleteEntryTitle")}
          message={
            pendingDelete.kind === "customer"
              ? t("customer.deleteCustomerMessage", { name: customer.name })
              : t("customer.deleteEntryMessage")
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {showReminder && (
        <WhatsAppReminderModal customer={customer} onClose={() => setShowReminder(false)} onSaved={onSaved} />
      )}

      {showExportSummary && (
        <ExportSummaryModal
          customer={customer}
          shopLabel={shopLabel}
          transactions={history}
          onClose={() => setShowExportSummary(false)}
          onSaved={onSaved}
        />
      )}

      {showEditCustomer && (
        <AddCustomerModal
          userId={customer.user_id}
          customer={customer}
          onClose={() => setShowEditCustomer(false)}
          onAdded={() => {
            setShowEditCustomer(false);
            onSaved();
          }}
        />
      )}
    </Modal>
  );
}
