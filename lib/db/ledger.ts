import {
  addTransaction,
  updateBankAccount,
  updateCustomer,
  type LocalBankAccount,
  type LocalCustomer,
} from "./offlineStorage";

/**
 * Customer khata balance convention: current_balance is what the customer owes
 * the shopkeeper. "Diye" (goods/credit given out) increases it; "Milay"
 * (payment received) decreases it.
 */
export async function recordCustomerTransaction(
  customer: LocalCustomer,
  type: "IN" | "OUT",
  amount: number,
  note: string | undefined,
  transactionDate: string
): Promise<void> {
  const delta = type === "OUT" ? amount : -amount;

  await addTransaction({
    user_id: customer.user_id,
    entity_type: "customer",
    entity_id: customer.id,
    type,
    amount,
    note,
    transaction_date: transactionDate,
  });

  await updateCustomer(customer.id, {
    current_balance: customer.current_balance + delta,
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

  await recordCustomerTransaction(customer, type, amount, "Hisaab Baraber", transactionDate);
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
