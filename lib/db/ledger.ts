import {
  addTransaction,
  deleteBankAccount,
  deleteCustomer,
  deleteTransaction,
  getItem,
  getTransactionsForEntity,
  updateBankAccount,
  updateCustomer,
  updateItem,
  updateTransaction,
  type LineItem,
  type LocalBankAccount,
  type LocalCustomer,
  type LocalTransaction,
} from "./offlineStorage";

export interface CustomerEntryFields {
  note?: string;
  items?: LineItem[];
  photoId?: string;
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
): Promise<void> {
  const delta = type === "OUT" ? amount : -amount;

  await addTransaction({
    user_id: customer.user_id,
    entity_type: "customer",
    entity_id: customer.id,
    type,
    amount,
    note: fields.note,
    items: fields.items,
    photo_id: fields.photoId,
    transaction_date: transactionDate,
  });

  if (type === "OUT") {
    await applyStockDelta(customer.user_id, fields.items, -1);
  }

  const latest =
    !customer.last_transaction_at || transactionDate > customer.last_transaction_at
      ? transactionDate
      : customer.last_transaction_at;

  await updateCustomer(customer.id, {
    current_balance: customer.current_balance + delta,
    last_transaction_at: latest,
  });
}

/**
 * Overwrites an existing customer entry in place and reconciles the running
 * balance: reverses the original entry's effect, then applies the new one.
 * Stock is reconciled the same way — restore whatever the original itemized
 * OUT entry consumed, then re-apply whatever the edited entry now consumes.
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
    transaction_date: transactionDate,
  });

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

/** Bank/wallet cash flow: IN increases the account balance, OUT decreases it. */
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

/** Deletes one customer entry and reverses its effect on the running balance and stock. */
export async function deleteCustomerTransactionEntry(
  customer: LocalCustomer,
  transaction: LocalTransaction
): Promise<void> {
  const reverseDelta = transaction.type === "OUT" ? -transaction.amount : transaction.amount;

  if (transaction.type === "OUT") {
    await applyStockDelta(customer.user_id, transaction.items, 1);
  }

  await deleteTransaction(transaction.id, customer.user_id);
  await updateCustomer(customer.id, {
    current_balance: customer.current_balance + reverseDelta,
    last_transaction_at: await latestTransactionDate(customer.id),
  });
}

/** Deletes one bank/wallet entry and reverses its effect on the running balance. */
export async function deleteBankTransactionEntry(
  account: LocalBankAccount,
  transaction: LocalTransaction
): Promise<void> {
  const reverseDelta = transaction.type === "IN" ? -transaction.amount : transaction.amount;

  await deleteTransaction(transaction.id, account.user_id);
  await updateBankAccount(account.id, {
    current_balance: account.current_balance + reverseDelta,
  });
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
