import { createClient } from "@/lib/supabase/client";
import {
  getUnsyncedCustomers,
  getUnsyncedBankAccounts,
  getUnsyncedTransactions,
  getUnsyncedItems,
  getUnsyncedCashbookEntries,
  getUnsyncedBusinessSettings,
  getPendingDeletes,
  clearPendingDelete,
  markSynced,
  markBusinessSettingsSynced,
  hydrateCustomers,
  hydrateBankAccounts,
  hydrateTransactions,
  hydrateItems,
  hydrateCashbookEntries,
  hydrateBusinessSettings,
  type LocalEntityTable,
} from "@/lib/db/offlineStorage";
import { markSyncedNow } from "@/lib/sync/syncStatus";

const TABLE_TO_SUPABASE: Record<LocalEntityTable, string> = {
  customers: "customers",
  bankAccounts: "bank_accounts",
  transactions: "transactions",
  items: "items",
  cashbookEntries: "cashbook_entries",
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

    const [customers, bankAccounts, transactions, items, cashbookEntries, businessSettings] =
      await Promise.all([
        getUnsyncedCustomers(userId),
        getUnsyncedBankAccounts(userId),
        getUnsyncedTransactions(userId),
        getUnsyncedItems(userId),
        getUnsyncedCashbookEntries(userId),
        getUnsyncedBusinessSettings(userId),
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
        items: txn.items ?? null,
        // photo_id is deliberately omitted — photos are local-only (no Supabase
        // Storage configured), so a synced reference would be dangling on other devices.
        payment_method: txn.payment_method ?? null,
        payment_account_id: txn.payment_account_id ?? null,
        link_kind: txn.link_kind ?? null,
        linked_transaction_id: txn.linked_transaction_id ?? null,
        linked_cashbook_entry_id: txn.linked_cashbook_entry_id ?? null,
        transaction_date: txn.transaction_date,
        created_at: txn.created_at,
        synced: true,
      });
      if (!error) await markSynced("transactions", txn.id);
    }

    for (const item of items) {
      const { error } = await supabase.from("items").upsert({
        id: item.id,
        user_id: item.user_id,
        name: item.name,
        stock_quantity: item.stock_quantity,
        purchase_price: item.purchase_price ?? null,
        selling_price: item.selling_price ?? null,
        low_stock_threshold: item.low_stock_threshold ?? null,
        created_at: item.created_at,
        updated_at: item.updated_at,
      });
      if (!error) await markSynced("items", item.id);
    }

    for (const entry of cashbookEntries) {
      const { error } = await supabase.from("cashbook_entries").upsert({
        id: entry.id,
        user_id: entry.user_id,
        type: entry.type,
        amount: entry.amount,
        category: entry.category,
        note: entry.note ?? null,
        is_expense: entry.is_expense ?? false,
        payment_method: entry.payment_method ?? "cash",
        account_id: entry.account_id ?? null,
        link_kind: entry.link_kind ?? null,
        linked_transaction_id: entry.linked_transaction_id ?? null,
        // photo_id is deliberately omitted — same reasoning as transaction photos.
        entry_date: entry.entry_date,
        created_at: entry.created_at,
      });
      if (!error) await markSynced("cashbookEntries", entry.id);
    }

    if (businessSettings) {
      const { error } = await supabase.from("business_settings").upsert({
        user_id: businessSettings.user_id,
        business_name: businessSettings.business_name ?? null,
        phone: businessSettings.phone ?? null,
        address: businessSettings.address ?? null,
        category: businessSettings.category ?? null,
        language: businessSettings.language,
        created_at: businessSettings.created_at,
        updated_at: businessSettings.updated_at,
      });
      if (!error) await markBusinessSettingsSynced(userId);
    }

    markSyncedNow(userId);
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

  const [
    customersRes,
    bankAccountsRes,
    transactionsRes,
    itemsRes,
    cashbookRes,
    businessSettingsRes,
  ] = await Promise.all([
    supabase.from("customers").select("*").eq("user_id", userId),
    supabase.from("bank_accounts").select("*").eq("user_id", userId),
    supabase.from("transactions").select("*").eq("user_id", userId),
    supabase.from("items").select("*").eq("user_id", userId),
    supabase.from("cashbook_entries").select("*").eq("user_id", userId),
    supabase.from("business_settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  if (customersRes.data) await hydrateCustomers(customersRes.data);
  if (bankAccountsRes.data) await hydrateBankAccounts(bankAccountsRes.data);
  if (transactionsRes.data) await hydrateTransactions(transactionsRes.data);
  if (itemsRes.data) await hydrateItems(itemsRes.data);
  if (cashbookRes.data) await hydrateCashbookEntries(cashbookRes.data);
  if (businessSettingsRes.data) {
    await hydrateBusinessSettings({
      id: businessSettingsRes.data.user_id,
      ...businessSettingsRes.data,
    });
  }
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
