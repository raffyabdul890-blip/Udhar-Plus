import {
  addTransaction,
  deleteBankAccount,
  deleteCustomer,
  deleteTransaction,
  updateBankAccount,
  updateCustomer,
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

  await updateCustomer(customer.id, {
    current_balance: customer.current_balance + delta,
  });
}

/**
 * Overwrites an existing customer entry in place and reconciles the running
 * balance: reverses the original entry's effect, then applies the new one.
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

/** Deletes one customer entry and reverses its effect on the running balance. */
export async function deleteCustomerTransactionEntry(
  customer: LocalCustomer,
  transaction: LocalTransaction
): Promise<void> {
  const reverseDelta = transaction.type === "OUT" ? -transaction.amount : transaction.amount;

  await deleteTransaction(transaction.id, customer.user_id);
  await updateCustomer(customer.id, {
    current_balance: customer.current_balance + reverseDelta,
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
