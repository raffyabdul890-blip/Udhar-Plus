import {
  addCashbookEntry,
  addTransaction,
  deleteBankAccount,
  deleteCashbookEntry,
  deleteCustomer,
  deleteTransaction,
  getBankAccount,
  getItem,
  getTransaction,
  getTransactionsForEntity,
  updateBankAccount,
  updateCashbookEntry,
  updateCustomer,
  updateItem,
  updateTransaction,
  type CashbookEntry,
  type LineItem,
  type LocalBankAccount,
  type LocalCustomer,
  type LocalTransaction,
} from "./offlineStorage";

export interface CustomerEntryFields {
  note?: string;
  items?: LineItem[];
  photoId?: string;
  /** Milay ("IN") only — routes the payment into Cashbook (cash) or an account (bank/wallet), one user action. */
  paymentMethod?: "cash" | "bank" | "wallet";
  /** Required when paymentMethod is "bank" or "wallet". */
  paymentAccount?: LocalBankAccount;
}

/**
 * Itemized "Diye" (OUT) entries represent goods leaving the shop, so their
 * catalog-linked lines decrement stock; sign=1 reverses that (edit/delete).
 * Applied as an absolute stock_quantity write (not a server-side increment),
 * matching how current_balance already syncs — safe to re-push on retry since
 * it's idempotent, and never double-applies since each caller here runs it
 * exactly once per transaction write. Missing/deleted catalog items are
 * skipped rather than throwing — nothing to adjust.
 */
async function applyStockDelta(
  userId: string,
  items: LineItem[] | undefined,
  sign: 1 | -1
): Promise<void> {
  if (!items?.length) return;
  for (const line of items) {
    if (!line.itemId || !line.quantity) continue;
    const item = await getItem(line.itemId);
    if (!item || item.user_id !== userId) continue;
    await updateItem(item.id, { stock_quantity: item.stock_quantity + sign * line.quantity });
  }
}

/** Recomputes the denormalized last_transaction_at from this customer's own (indexed) history. */
async function latestTransactionDate(customerId: string): Promise<string | undefined> {
  const related = await getTransactionsForEntity("customer", customerId);
  return related.reduce<string | undefined>(
    (max, t) => (!max || t.transaction_date > max ? t.transaction_date : max),
    undefined
  );
}

/**
 * Reverses whatever a Milay payment's "payment_owner" side is currently
 * linked to — deletes the auto-created cash entry, or deletes the linked
 * bank leg and reverses that account's balance. No-op for anything that
 * isn't a linked payment (Diye, Hisaab Baraber, plain unlinked Milay).
 */
async function reverseCustomerPaymentLink(transaction: LocalTransaction): Promise<void> {
  if (transaction.link_kind !== "payment_owner") return;

  if (transaction.linked_cashbook_entry_id) {
    await deleteCashbookEntry(transaction.linked_cashbook_entry_id, transaction.user_id);
  }
  if (transaction.linked_transaction_id) {
    const bankTxn = await getTransaction(transaction.linked_transaction_id);
    if (bankTxn) {
      const account = await getBankAccount(bankTxn.entity_id);
      await deleteTransaction(bankTxn.id, transaction.user_id);
      if (account) {
        await updateBankAccount(account.id, { current_balance: account.current_balance - bankTxn.amount });
      }
    }
  }
}

/**
 * Applies a Milay payment's routing: cash goes to a linked Cashbook entry,
 * bank/wallet goes to a linked bank leg that also updates that account's
 * balance. Links both sides by ID so edit/delete can reverse them exactly.
 */
async function applyCustomerPaymentLink(
  customerTxn: LocalTransaction,
  customerName: string,
  fields: CustomerEntryFields
): Promise<void> {
  if (!fields.paymentMethod) return;

  if (fields.paymentMethod === "cash") {
    const cashEntry = await addCashbookEntry({
      user_id: customerTxn.user_id,
      type: "IN",
      amount: customerTxn.amount,
      category: "Customer Payment",
      note: `Payment from ${customerName}`,
      is_expense: false,
      payment_method: "cash",
      link_kind: "payment_leg",
      linked_transaction_id: customerTxn.id,
      entry_date: customerTxn.transaction_date,
    });
    await updateTransaction(customerTxn.id, {
      link_kind: "payment_owner",
      linked_cashbook_entry_id: cashEntry.id,
    });
    return;
  }

  const account = fields.paymentAccount;
  if (!account) return;

  const bankTxn = await addTransaction({
    user_id: account.user_id,
    entity_type: "bank",
    entity_id: account.id,
    type: "IN",
    amount: customerTxn.amount,
    note: `Payment from ${customerName}`,
    link_kind: "customer_payment_leg",
    linked_transaction_id: customerTxn.id,
    transaction_date: customerTxn.transaction_date,
  });
  await updateTransaction(customerTxn.id, {
    link_kind: "payment_owner",
    payment_account_id: account.id,
    linked_transaction_id: bankTxn.id,
  });
  await updateBankAccount(account.id, { current_balance: account.current_balance + customerTxn.amount });
}

/**
 * Customer khata balance convention: current_balance is what the customer owes
 * the shopkeeper. "Diye" (goods/credit given out) increases it; "Milay"
 * (payment received) decreases it.
 */
export async function recordCustomerTransaction(
  customer: LocalCustomer,
  type: "IN" | "OUT",
  amount: number,
  transactionDate: string,
  fields: CustomerEntryFields = {}
): Promise<LocalTransaction> {
  const delta = type === "OUT" ? amount : -amount;

  const customerTxn = await addTransaction({
    user_id: customer.user_id,
    entity_type: "customer",
    entity_id: customer.id,
    type,
    amount,
    note: fields.note,
    items: fields.items,
    photo_id: fields.photoId,
    payment_method: type === "IN" ? fields.paymentMethod : undefined,
    transaction_date: transactionDate,
  });

  if (type === "OUT") {
    await applyStockDelta(customer.user_id, fields.items, -1);
  } else if (fields.paymentMethod) {
    await applyCustomerPaymentLink(customerTxn, customer.name, fields);
  }

  const latest =
    !customer.last_transaction_at || transactionDate > customer.last_transaction_at
      ? transactionDate
      : customer.last_transaction_at;

  await updateCustomer(customer.id, {
    current_balance: customer.current_balance + delta,
    last_transaction_at: latest,
  });

  return customerTxn;
}

/**
 * Overwrites an existing customer entry in place and reconciles the running
 * balance: reverses the original entry's effect, then applies the new one.
 * Stock and any Milay payment link (Cashbook/bank leg) are reconciled the
 * same way — fully reverse whatever the original consumed/created, then
 * re-apply whatever the edited entry now needs. Simpler and safer than
 * patching a link in place, and mirrors the existing stock-reversal pattern.
 */
export async function updateCustomerTransactionEntry(
  customer: LocalCustomer,
  original: LocalTransaction,
  type: "IN" | "OUT",
  amount: number,
  transactionDate: string,
  fields: CustomerEntryFields = {}
): Promise<void> {
  const reverseOriginal = original.type === "OUT" ? -original.amount : original.amount;
  const applyNew = type === "OUT" ? amount : -amount;

  if (original.type === "OUT") {
    await applyStockDelta(customer.user_id, original.items, 1);
  } else {
    await reverseCustomerPaymentLink(original);
  }
  if (type === "OUT") {
    await applyStockDelta(customer.user_id, fields.items, -1);
  }

  await updateTransaction(original.id, {
    type,
    amount,
    note: fields.note,
    items: fields.items,
    photo_id: fields.photoId,
    payment_method: type === "IN" ? fields.paymentMethod : undefined,
    payment_account_id: undefined,
    link_kind: undefined,
    linked_transaction_id: undefined,
    linked_cashbook_entry_id: undefined,
  });

  if (type === "IN" && fields.paymentMethod) {
    const updated = await getTransaction(original.id);
    if (updated) await applyCustomerPaymentLink(updated, customer.name, fields);
  }

  await updateCustomer(customer.id, {
    current_balance: customer.current_balance + reverseOriginal + applyNew,
    last_transaction_at: await latestTransactionDate(customer.id),
  });
}

/** "Hisaab Baraber" — clears the customer's balance to zero with one adjusting entry. */
export async function settleCustomerBalance(
  customer: LocalCustomer,
  transactionDate: string
): Promise<void> {
  if (customer.current_balance === 0) return;

  const type = customer.current_balance > 0 ? "IN" : "OUT";
  const amount = Math.abs(customer.current_balance);

  await recordCustomerTransaction(customer, type, amount, transactionDate, {
    note: "Hisaab Baraber",
  });
}

/** Bank/wallet cash flow: IN increases the account balance, OUT decreases it. Plain Add/Remove Money — no linking. */
export async function recordBankTransaction(
  account: LocalBankAccount,
  type: "IN" | "OUT",
  amount: number,
  note: string | undefined,
  transactionDate: string
): Promise<void> {
  const delta = type === "IN" ? amount : -amount;

  await addTransaction({
    user_id: account.user_id,
    entity_type: "bank",
    entity_id: account.id,
    type,
    amount,
    note,
    transaction_date: transactionDate,
  });

  await updateBankAccount(account.id, {
    current_balance: account.current_balance + delta,
  });
}

/** Edits a plain (unlinked) bank/wallet entry — reverses the original delta, applies the new one. */
export async function updateBankTransactionEntry(
  account: LocalBankAccount,
  original: LocalTransaction,
  type: "IN" | "OUT",
  amount: number,
  note: string | undefined,
  transactionDate: string
): Promise<void> {
  const reverseOriginal = original.type === "IN" ? -original.amount : original.amount;
  const applyNew = type === "IN" ? amount : -amount;

  await updateTransaction(original.id, { type, amount, note, transaction_date: transactionDate });
  await updateBankAccount(account.id, {
    current_balance: account.current_balance + reverseOriginal + applyNew,
  });
}

/** Deletes one customer entry and reverses its effect on the running balance, stock, and any payment link. */
export async function deleteCustomerTransactionEntry(
  customer: LocalCustomer,
  transaction: LocalTransaction
): Promise<void> {
  const reverseDelta = transaction.type === "OUT" ? -transaction.amount : transaction.amount;

  if (transaction.type === "OUT") {
    await applyStockDelta(customer.user_id, transaction.items, 1);
  } else {
    await reverseCustomerPaymentLink(transaction);
  }

  await deleteTransaction(transaction.id, customer.user_id);
  await updateCustomer(customer.id, {
    current_balance: customer.current_balance + reverseDelta,
    last_transaction_at: await latestTransactionDate(customer.id),
  });
}

/**
 * Deletes one bank/wallet entry and reverses its effect on the running
 * balance. If it's a transfer leg, the other leg is deleted too so a
 * transfer can never end up half-reversed. Entries linked from an Expense or
 * a customer payment (link_kind "expense_leg" / "customer_payment_leg")
 * should never reach here directly — the UI blocks editing/deleting them
 * from the bank side and redirects to their owning screen instead.
 */
export async function deleteBankTransactionEntry(
  account: LocalBankAccount,
  transaction: LocalTransaction
): Promise<void> {
  const reverseDelta = transaction.type === "IN" ? -transaction.amount : transaction.amount;

  await deleteTransaction(transaction.id, account.user_id);
  await updateBankAccount(account.id, {
    current_balance: account.current_balance + reverseDelta,
  });

  if (transaction.link_kind === "transfer_leg" && transaction.linked_transaction_id) {
    const otherLeg = await getTransaction(transaction.linked_transaction_id);
    if (otherLeg) {
      const otherAccount = await getBankAccount(otherLeg.entity_id);
      const otherReverse = otherLeg.type === "IN" ? -otherLeg.amount : otherLeg.amount;
      await deleteTransaction(otherLeg.id, account.user_id);
      if (otherAccount) {
        await updateBankAccount(otherAccount.id, {
          current_balance: otherAccount.current_balance + otherReverse,
        });
      }
    }
  }
}

/**
 * Records a manual transfer between two of the shopkeeper's own in-app
 * accounts — an internal bookkeeping entry only, never a real bank transfer.
 * Creates two linked legs (OUT on the source, IN on the destination) so
 * editing/deleting either one keeps both balances correct.
 */
export async function recordTransfer(
  fromAccount: LocalBankAccount,
  toAccount: LocalBankAccount,
  amount: number,
  note: string | undefined,
  transactionDate: string
): Promise<void> {
  const outLeg = await addTransaction({
    user_id: fromAccount.user_id,
    entity_type: "bank",
    entity_id: fromAccount.id,
    type: "OUT",
    amount,
    note: note || `Transfer to ${toAccount.account_title}`,
    link_kind: "transfer_leg",
    transaction_date: transactionDate,
  });
  const inLeg = await addTransaction({
    user_id: toAccount.user_id,
    entity_type: "bank",
    entity_id: toAccount.id,
    type: "IN",
    amount,
    note: note || `Transfer from ${fromAccount.account_title}`,
    link_kind: "transfer_leg",
    linked_transaction_id: outLeg.id,
    transaction_date: transactionDate,
  });
  await updateTransaction(outLeg.id, { linked_transaction_id: inLeg.id });

  await updateBankAccount(fromAccount.id, { current_balance: fromAccount.current_balance - amount });
  await updateBankAccount(toAccount.id, { current_balance: toAccount.current_balance + amount });
}

/** Edits both legs of a transfer together (amount/note/date only — not which accounts are involved). */
export async function updateTransferEntry(
  leg: LocalTransaction,
  amount: number,
  note: string | undefined,
  transactionDate: string
): Promise<void> {
  if (!leg.linked_transaction_id) return;
  const otherLeg = await getTransaction(leg.linked_transaction_id);
  if (!otherLeg) return;

  const legAccount = await getBankAccount(leg.entity_id);
  const otherAccount = await getBankAccount(otherLeg.entity_id);
  if (!legAccount || !otherAccount) return;

  const legReverse = leg.type === "IN" ? -leg.amount : leg.amount;
  const otherReverse = otherLeg.type === "IN" ? -otherLeg.amount : otherLeg.amount;
  const legApply = leg.type === "IN" ? amount : -amount;
  const otherApply = otherLeg.type === "IN" ? amount : -amount;

  await updateTransaction(leg.id, { amount, note: note || leg.note, transaction_date: transactionDate });
  await updateTransaction(otherLeg.id, { amount, note: note || otherLeg.note, transaction_date: transactionDate });

  await updateBankAccount(legAccount.id, { current_balance: legAccount.current_balance + legReverse + legApply });
  await updateBankAccount(otherAccount.id, {
    current_balance: otherAccount.current_balance + otherReverse + otherApply,
  });
}

export interface CashbookEntryFields {
  type: "IN" | "OUT";
  amount: number;
  category: string;
  note?: string;
  isExpense: boolean;
  paymentMethod: "cash" | "bank" | "wallet";
  /** Required when paymentMethod is "bank" or "wallet" and isExpense is true. */
  account?: LocalBankAccount;
  photoId?: string;
  entryDate: string;
}

/** Reverses a cashbook entry's linked bank leg (Expense paid via bank/wallet), if any. */
async function reverseExpenseLink(entry: CashbookEntry): Promise<void> {
  if (entry.link_kind !== "expense_owner" || !entry.linked_transaction_id) return;
  const bankTxn = await getTransaction(entry.linked_transaction_id);
  if (!bankTxn) return;
  const account = await getBankAccount(bankTxn.entity_id);
  await deleteTransaction(bankTxn.id, entry.user_id);
  if (account) {
    const reverse = bankTxn.type === "IN" ? -bankTxn.amount : bankTxn.amount;
    await updateBankAccount(account.id, { current_balance: account.current_balance + reverse });
  }
}

/**
 * Records a Cashbook/Expense entry. A "cash" entry is the record itself — no
 * linking needed, matching Phase 4's design. A bank/wallet EXPENSE also
 * creates a linked bank leg and updates that account's balance in the same
 * user action; a plain (non-expense) Cash In/Out never touches an account.
 */
export async function recordCashbookEntry(
  userId: string,
  fields: CashbookEntryFields
): Promise<CashbookEntry> {
  const entry = await addCashbookEntry({
    user_id: userId,
    type: fields.type,
    amount: fields.amount,
    category: fields.category,
    note: fields.note,
    is_expense: fields.isExpense,
    payment_method: fields.paymentMethod,
    photo_id: fields.photoId,
    entry_date: fields.entryDate,
  });

  if (fields.isExpense && fields.paymentMethod !== "cash" && fields.account) {
    const account = fields.account;
    const bankTxn = await addTransaction({
      user_id: account.user_id,
      entity_type: "bank",
      entity_id: account.id,
      type: "OUT",
      amount: fields.amount,
      note: `Expense: ${fields.category}`,
      link_kind: "expense_leg",
      linked_cashbook_entry_id: entry.id,
      transaction_date: fields.entryDate,
    });
    await updateCashbookEntry(entry.id, {
      account_id: account.id,
      link_kind: "expense_owner",
      linked_transaction_id: bankTxn.id,
    });
    await updateBankAccount(account.id, { current_balance: account.current_balance - fields.amount });
  }

  return entry;
}

/** Edits a Cashbook/Expense entry — fully reverses any existing bank link, then re-applies as needed. */
export async function updateCashbookEntryWithLink(
  original: CashbookEntry,
  fields: CashbookEntryFields
): Promise<void> {
  await reverseExpenseLink(original);

  await updateCashbookEntry(original.id, {
    type: fields.type,
    amount: fields.amount,
    category: fields.category,
    note: fields.note,
    is_expense: fields.isExpense,
    payment_method: fields.paymentMethod,
    photo_id: fields.photoId,
    entry_date: fields.entryDate,
    account_id: undefined,
    link_kind: undefined,
    linked_transaction_id: undefined,
  });

  if (fields.isExpense && fields.paymentMethod !== "cash" && fields.account) {
    const account = fields.account;
    const bankTxn = await addTransaction({
      user_id: account.user_id,
      entity_type: "bank",
      entity_id: account.id,
      type: "OUT",
      amount: fields.amount,
      note: `Expense: ${fields.category}`,
      link_kind: "expense_leg",
      linked_cashbook_entry_id: original.id,
      transaction_date: fields.entryDate,
    });
    await updateCashbookEntry(original.id, {
      account_id: account.id,
      link_kind: "expense_owner",
      linked_transaction_id: bankTxn.id,
    });
    await updateBankAccount(account.id, { current_balance: account.current_balance - fields.amount });
  }
}

/** Deletes a Cashbook/Expense entry, reversing its linked bank leg first if any. */
export async function deleteCashbookEntryWithLink(entry: CashbookEntry): Promise<void> {
  await reverseExpenseLink(entry);
  await deleteCashbookEntry(entry.id, entry.user_id);
}

/**
 * Deletes a customer and every transaction tied to them — `transactions` has no
 * DB-level cascade (entity_id is polymorphic across customers/bank_accounts), so
 * the app deletes the history explicitly to avoid orphaned rows once synced.
 */
export async function deleteCustomerWithHistory(
  customer: LocalCustomer,
  transactions: LocalTransaction[]
): Promise<void> {
  const related = transactions.filter(
    (t) => t.entity_type === "customer" && t.entity_id === customer.id
  );
  for (const txn of related) {
    await reverseCustomerPaymentLink(txn);
    await deleteTransaction(txn.id, customer.user_id);
  }
  await deleteCustomer(customer.id, customer.user_id);
}

/** Same cascade as {@link deleteCustomerWithHistory}, for bank/wallet accounts. */
export async function deleteBankAccountWithHistory(
  account: LocalBankAccount,
  transactions: LocalTransaction[]
): Promise<void> {
  const related = transactions.filter(
    (t) => t.entity_type === "bank" && t.entity_id === account.id
  );
  for (const txn of related) {
    await deleteTransaction(txn.id, account.user_id);
  }
  await deleteBankAccount(account.id, account.user_id);
}
