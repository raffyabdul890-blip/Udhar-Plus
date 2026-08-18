import { createClient } from "@/lib/supabase/client";
import {
  getUnsyncedCustomers,
  getUnsyncedBankAccounts,
  getUnsyncedTransactions,
  getPendingDeletes,
  clearPendingDelete,
  markSynced,
  hydrateCustomers,
  hydrateBankAccounts,
  hydrateTransactions,
  type LocalEntityTable,
} from "@/lib/db/offlineStorage";

const TABLE_TO_SUPABASE: Record<LocalEntityTable, string> = {
  customers: "customers",
  bankAccounts: "bank_accounts",
  transactions: "transactions",
};

const SYNC_INTERVAL_MS = 30_000;

let syncInFlight = false;

/**
 * Pushes every pending (unsynced) local write and queued delete to Supabase.
 * Safe to call repeatedly — a no-op while offline or while a sync is already running.
 */
export async function syncPendingRecords(userId: string): Promise<void> {
  if (syncInFlight) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  syncInFlight = true;
  const supabase = createClient();

  try {
    const deletes = await getPendingDeletes();
    for (const del of deletes) {
      if (del.user_id !== userId) continue;
      const { error } = await supabase
        .from(TABLE_TO_SUPABASE[del.table])
        .delete()
        .eq("id", del.id);
      if (!error) await clearPendingDelete(del.id);
    }

    const [customers, bankAccounts, transactions] = await Promise.all([
      getUnsyncedCustomers(userId),
      getUnsyncedBankAccounts(userId),
      getUnsyncedTransactions(userId),
    ]);

    for (const customer of customers) {
      const { error } = await supabase.from("customers").upsert({
        id: customer.id,
        user_id: customer.user_id,
        name: customer.name,
        description: customer.description ?? null,
        phone: customer.phone ?? null,
        current_balance: customer.current_balance,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      });
      if (!error) await markSynced("customers", customer.id);
    }

    for (const account of bankAccounts) {
      const { error } = await supabase.from("bank_accounts").upsert({
        id: account.id,
        user_id: account.user_id,
        bank_name: account.bank_name,
        bank_code: account.bank_code,
        account_title: account.account_title,
        account_number: account.account_number,
        current_balance: account.current_balance,
        created_at: account.created_at,
        updated_at: account.updated_at,
      });
      if (!error) await markSynced("bankAccounts", account.id);
    }

    for (const txn of transactions) {
      const { error } = await supabase.from("transactions").upsert({
        id: txn.id,
        user_id: txn.user_id,
        entity_type: txn.entity_type,
        entity_id: txn.entity_id,
        type: txn.type,
        amount: txn.amount,
        note: txn.note ?? null,
        transaction_date: txn.transaction_date,
        created_at: txn.created_at,
        synced: true,
      });
      if (!error) await markSynced("transactions", txn.id);
    }
  } finally {
    syncInFlight = false;
  }
}

/**
 * Recovery flow: after a fresh phone + OTP login, pulls every historic record
 * the user owns from Supabase Cloud Vault into local IndexedDB.
 */
export async function hydrateFromCloud(userId: string): Promise<void> {
  const supabase = createClient();

  const [customersRes, bankAccountsRes, transactionsRes] = await Promise.all([
    supabase.from("customers").select("*").eq("user_id", userId),
    supabase.from("bank_accounts").select("*").eq("user_id", userId),
    supabase.from("transactions").select("*").eq("user_id", userId),
  ]);

  if (customersRes.data) await hydrateCustomers(customersRes.data);
  if (bankAccountsRes.data) await hydrateBankAccounts(bankAccountsRes.data);
  if (transactionsRes.data) await hydrateTransactions(transactionsRes.data);
}

/**
 * Starts the background sync manager: an immediate attempt, a listener for the
 * browser's `online` event, and a interval fallback for connectivity that
 * flickers back without firing that event. Returns a cleanup function.
 */
export function initSyncEngine(userId: string): () => void {
  if (typeof window === "undefined") return () => {};

  const triggerSync = () => void syncPendingRecords(userId);

  window.addEventListener("online", triggerSync);
  triggerSync();
  const interval = window.setInterval(triggerSync, SYNC_INTERVAL_MS);

  return () => {
    window.removeEventListener("online", triggerSync);
    window.clearInterval(interval);
  };
}
