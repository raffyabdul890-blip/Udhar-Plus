import Dexie, { type Table } from "dexie";

export interface LocalCustomer {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  /** WhatsApp/phone number for payment reminders — saved on first use, any common format. */
  phone?: string;
  current_balance: number;
  /**
   * Denormalized max(transaction_date) across this customer's entries — same
   * pattern as current_balance, kept in sync by lib/db/ledger.ts on every
   * record/update/delete. Lets the customer list show "last entry" without
   * loading the entire transactions table. May be stale/undefined for
   * customers whose history predates this field; it self-heals on their next
   * transaction write.
   */
  last_transaction_at?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface LocalBankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  bank_code: string;
  account_title: string;
  account_number: string;
  current_balance: number;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface LineItem {
  id: string;
  /** References LocalItem.id when picked from the catalog — undefined for a freehand/manual line. */
  itemId?: string;
  name: string;
  quantity: number;
  unit?: string;
  pricePerUnit: number;
}

export interface LocalTransaction {
  id: string;
  user_id: string;
  entity_type: "customer" | "bank";
  entity_id: string;
  type: "IN" | "OUT";
  amount: number;
  note?: string;
  /** Itemized breakdown, customer entries only. Synced as jsonb — see supabase_schema.sql. */
  items?: LineItem[];
  /** References `photos.id` — local-only, never synced (no Supabase Storage configured yet). */
  photo_id?: string;
  transaction_date: string;
  created_at: string;
  synced: boolean;
}

/** A photo attached to a transaction (e.g. a receipt). Local-only — see `photo_id` above. */
export interface LocalPhoto {
  id: string;
  user_id: string;
  blob: Blob;
  created_at: string;
}

/** A stocked product — Items/Inventory tab. */
export interface LocalItem {
  id: string;
  user_id: string;
  name: string;
  stock_quantity: number;
  purchase_price?: number;
  selling_price?: number;
  /** Below this, the Items tab flags the product as low stock. Defaults to 5 if unset. */
  low_stock_threshold?: number;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

/** A daily cash IN/OUT entry — Cashbook tab. Not tied to a customer or bank account. */
export interface CashbookEntry {
  id: string;
  user_id: string;
  type: "IN" | "OUT";
  amount: number;
  category: string;
  note?: string;
  entry_date: string;
  created_at: string;
  synced: boolean;
}

/** One row per user — business profile shown on the Customers header and More tab. */
export interface LocalBusinessSettings {
  id: string;
  user_id: string;
  business_name?: string;
  phone?: string;
  address?: string;
  category?: string;
  /** References `photos.id`. */
  logo_photo_id?: string;
  language: "en" | "ur";
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export type LocalEntityTable =
  | "customers"
  | "bankAccounts"
  | "transactions"
  | "items"
  | "cashbookEntries";

export interface PendingDelete {
  id: string;
  table: LocalEntityTable;
  user_id: string;
  deleted_at: string;
}

class UdharPlusDB extends Dexie {
  customers!: Table<LocalCustomer, string>;
  bankAccounts!: Table<LocalBankAccount, string>;
  transactions!: Table<LocalTransaction, string>;
  pendingDeletes!: Table<PendingDelete, string>;
  photos!: Table<LocalPhoto, string>;

  items!: Table<LocalItem, string>;
  cashbookEntries!: Table<CashbookEntry, string>;
  businessSettings!: Table<LocalBusinessSettings, string>;

  constructor() {
    super("UdharPlusDB");
    // `synced` is deliberately not indexed — IndexedDB keys can't be booleans,
    // so unsynced lookups filter in memory after the user_id index narrows the set.
    this.version(1).stores({
      customers: "id, user_id, updated_at",
      bankAccounts: "id, user_id, updated_at",
      transactions: "id, user_id, [entity_type+entity_id]",
      pendingDeletes: "id, table, user_id",
    });
    this.version(2).stores({
      customers: "id, user_id, updated_at",
      bankAccounts: "id, user_id, updated_at",
      transactions: "id, user_id, [entity_type+entity_id]",
      pendingDeletes: "id, table, user_id",
      photos: "id, user_id",
    });
    this.version(3).stores({
      customers: "id, user_id, updated_at",
      bankAccounts: "id, user_id, updated_at",
      transactions: "id, user_id, [entity_type+entity_id]",
      pendingDeletes: "id, table, user_id",
      photos: "id, user_id",
      items: "id, user_id, updated_at",
      cashbookEntries: "id, user_id, entry_date",
      businessSettings: "id, user_id",
    });
  }
}

// Dexie touches `indexedDB` at construction time, which doesn't exist during
// Next.js server-side rendering of the client component that imports this
// module — so the instance is only created in the browser.
const db =
  typeof indexedDB !== "undefined"
    ? new UdharPlusDB()
    : (null as unknown as UdharPlusDB);

function requireDb(): UdharPlusDB {
  if (!db) {
    throw new Error("offlineStorage is only available in the browser");
  }
  return db;
}

function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function addCustomer(
  input: Omit<LocalCustomer, "id" | "created_at" | "updated_at" | "synced">
): Promise<LocalCustomer> {
  const record: LocalCustomer = {
    ...input,
    id: crypto.randomUUID(),
    created_at: nowIso(),
    updated_at: nowIso(),
    synced: false,
  };
  await requireDb().customers.put(record);
  return record;
}

export async function updateCustomer(
  id: string,
  changes: Partial<Omit<LocalCustomer, "id" | "user_id" | "created_at">>
): Promise<void> {
  await requireDb().customers.update(id, {
    ...changes,
    updated_at: nowIso(),
    synced: false,
  });
}

export async function deleteCustomer(id: string, userId: string): Promise<void> {
  await requireDb().transaction(
    "rw",
    requireDb().customers,
    requireDb().pendingDeletes,
    async () => {
      await requireDb().customers.delete(id);
      await requireDb().pendingDeletes.put({
        id,
        table: "customers",
        user_id: userId,
        deleted_at: nowIso(),
      });
    }
  );
}

export async function getCustomers(userId: string): Promise<LocalCustomer[]> {
  return requireDb().customers.where("user_id").equals(userId).toArray();
}

export async function getCustomer(id: string): Promise<LocalCustomer | undefined> {
  return requireDb().customers.get(id);
}

// ---------------------------------------------------------------------------
// Bank accounts
// ---------------------------------------------------------------------------

export async function addBankAccount(
  input: Omit<LocalBankAccount, "id" | "created_at" | "updated_at" | "synced">
): Promise<LocalBankAccount> {
  const record: LocalBankAccount = {
    ...input,
    id: crypto.randomUUID(),
    created_at: nowIso(),
    updated_at: nowIso(),
    synced: false,
  };
  await requireDb().bankAccounts.put(record);
  return record;
}

export async function updateBankAccount(
  id: string,
  changes: Partial<Omit<LocalBankAccount, "id" | "user_id" | "created_at">>
): Promise<void> {
  await requireDb().bankAccounts.update(id, {
    ...changes,
    updated_at: nowIso(),
    synced: false,
  });
}

export async function deleteBankAccount(id: string, userId: string): Promise<void> {
  await requireDb().transaction(
    "rw",
    requireDb().bankAccounts,
    requireDb().pendingDeletes,
    async () => {
      await requireDb().bankAccounts.delete(id);
      await requireDb().pendingDeletes.put({
        id,
        table: "bankAccounts",
        user_id: userId,
        deleted_at: nowIso(),
      });
    }
  );
}

export async function getBankAccounts(userId: string): Promise<LocalBankAccount[]> {
  return requireDb().bankAccounts.where("user_id").equals(userId).toArray();
}

export async function getBankAccount(id: string): Promise<LocalBankAccount | undefined> {
  return requireDb().bankAccounts.get(id);
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function addTransaction(
  input: Omit<LocalTransaction, "id" | "created_at" | "synced">
): Promise<LocalTransaction> {
  const record: LocalTransaction = {
    ...input,
    id: crypto.randomUUID(),
    created_at: nowIso(),
    synced: false,
  };
  await requireDb().transactions.put(record);
  return record;
}

export async function updateTransaction(
  id: string,
  changes: Partial<Omit<LocalTransaction, "id" | "user_id" | "created_at">>
): Promise<void> {
  await requireDb().transactions.update(id, { ...changes, synced: false });
}

export async function deleteTransaction(id: string, userId: string): Promise<void> {
  await requireDb().transaction(
    "rw",
    requireDb().transactions,
    requireDb().pendingDeletes,
    async () => {
      await requireDb().transactions.delete(id);
      await requireDb().pendingDeletes.put({
        id,
        table: "transactions",
        user_id: userId,
        deleted_at: nowIso(),
      });
    }
  );
}

export async function getTransactionsForEntity(
  entityType: LocalTransaction["entity_type"],
  entityId: string
): Promise<LocalTransaction[]> {
  return requireDb()
    .transactions.where("[entity_type+entity_id]")
    .equals([entityType, entityId])
    .toArray();
}

export async function getAllTransactions(userId: string): Promise<LocalTransaction[]> {
  return requireDb().transactions.where("user_id").equals(userId).toArray();
}

// ---------------------------------------------------------------------------
// Photos (local-only attachments — see LocalTransaction.photo_id)
// ---------------------------------------------------------------------------

export async function savePhoto(userId: string, blob: Blob): Promise<string> {
  const id = crypto.randomUUID();
  await requireDb().photos.put({ id, user_id: userId, blob, created_at: nowIso() });
  return id;
}

export async function getPhoto(id: string): Promise<LocalPhoto | undefined> {
  return requireDb().photos.get(id);
}

export async function deletePhoto(id: string): Promise<void> {
  await requireDb().photos.delete(id);
}

// ---------------------------------------------------------------------------
// Items / Inventory
// ---------------------------------------------------------------------------

export async function addItem(
  input: Omit<LocalItem, "id" | "created_at" | "updated_at" | "synced">
): Promise<LocalItem> {
  const record: LocalItem = {
    ...input,
    id: crypto.randomUUID(),
    created_at: nowIso(),
    updated_at: nowIso(),
    synced: false,
  };
  await requireDb().items.put(record);
  return record;
}

export async function updateItem(
  id: string,
  changes: Partial<Omit<LocalItem, "id" | "user_id" | "created_at">>
): Promise<void> {
  await requireDb().items.update(id, { ...changes, updated_at: nowIso(), synced: false });
}

export async function deleteItem(id: string, userId: string): Promise<void> {
  await requireDb().transaction("rw", requireDb().items, requireDb().pendingDeletes, async () => {
    await requireDb().items.delete(id);
    await requireDb().pendingDeletes.put({
      id,
      table: "items",
      user_id: userId,
      deleted_at: nowIso(),
    });
  });
}

export async function getItems(userId: string): Promise<LocalItem[]> {
  return requireDb().items.where("user_id").equals(userId).toArray();
}

export async function getItem(id: string): Promise<LocalItem | undefined> {
  return requireDb().items.get(id);
}

// ---------------------------------------------------------------------------
// Cashbook
// ---------------------------------------------------------------------------

export async function addCashbookEntry(
  input: Omit<CashbookEntry, "id" | "created_at" | "synced">
): Promise<CashbookEntry> {
  const record: CashbookEntry = {
    ...input,
    id: crypto.randomUUID(),
    created_at: nowIso(),
    synced: false,
  };
  await requireDb().cashbookEntries.put(record);
  return record;
}

export async function deleteCashbookEntry(id: string, userId: string): Promise<void> {
  await requireDb().transaction(
    "rw",
    requireDb().cashbookEntries,
    requireDb().pendingDeletes,
    async () => {
      await requireDb().cashbookEntries.delete(id);
      await requireDb().pendingDeletes.put({
        id,
        table: "cashbookEntries",
        user_id: userId,
        deleted_at: nowIso(),
      });
    }
  );
}

export async function getCashbookEntries(userId: string): Promise<CashbookEntry[]> {
  return requireDb().cashbookEntries.where("user_id").equals(userId).toArray();
}

// ---------------------------------------------------------------------------
// Business settings (one row per user)
// ---------------------------------------------------------------------------

export async function getBusinessSettings(
  userId: string
): Promise<LocalBusinessSettings | undefined> {
  return requireDb().businessSettings.get(userId);
}

export async function saveBusinessSettings(
  userId: string,
  changes: Partial<Omit<LocalBusinessSettings, "id" | "user_id" | "created_at">>
): Promise<LocalBusinessSettings> {
  const existing = await requireDb().businessSettings.get(userId);
  const record: LocalBusinessSettings = {
    id: userId,
    user_id: userId,
    language: "en",
    ...existing,
    ...changes,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
    synced: false,
  };
  await requireDb().businessSettings.put(record);
  return record;
}

// ---------------------------------------------------------------------------
// Sync helpers (consumed by lib/sync/syncEngine.ts)
// ---------------------------------------------------------------------------

export async function getUnsyncedCustomers(userId: string): Promise<LocalCustomer[]> {
  return requireDb()
    .customers.where("user_id")
    .equals(userId)
    .filter((c) => !c.synced)
    .toArray();
}

export async function getUnsyncedBankAccounts(userId: string): Promise<LocalBankAccount[]> {
  return requireDb()
    .bankAccounts.where("user_id")
    .equals(userId)
    .filter((b) => !b.synced)
    .toArray();
}

export async function getUnsyncedTransactions(userId: string): Promise<LocalTransaction[]> {
  return requireDb()
    .transactions.where("user_id")
    .equals(userId)
    .filter((t) => !t.synced)
    .toArray();
}

export async function getUnsyncedItems(userId: string): Promise<LocalItem[]> {
  return requireDb()
    .items.where("user_id")
    .equals(userId)
    .filter((i) => !i.synced)
    .toArray();
}

export async function getUnsyncedCashbookEntries(userId: string): Promise<CashbookEntry[]> {
  return requireDb()
    .cashbookEntries.where("user_id")
    .equals(userId)
    .filter((c) => !c.synced)
    .toArray();
}

export async function getUnsyncedBusinessSettings(
  userId: string
): Promise<LocalBusinessSettings | undefined> {
  const settings = await requireDb().businessSettings.get(userId);
  return settings && !settings.synced ? settings : undefined;
}

export async function getPendingDeletes(): Promise<PendingDelete[]> {
  return requireDb().pendingDeletes.toArray();
}

export async function clearPendingDelete(id: string): Promise<void> {
  await requireDb().pendingDeletes.delete(id);
}

export async function markSynced(table: LocalEntityTable, id: string): Promise<void> {
  await requireDb()[table].update(id, { synced: true } as Partial<
    LocalCustomer | LocalBankAccount | LocalTransaction | LocalItem | CashbookEntry
  >);
}

export async function markBusinessSettingsSynced(userId: string): Promise<void> {
  await requireDb().businessSettings.update(userId, { synced: true });
}

export async function hydrateCustomers(records: LocalCustomer[]): Promise<void> {
  await requireDb().customers.bulkPut(records.map((r) => ({ ...r, synced: true })));
}

export async function hydrateBankAccounts(records: LocalBankAccount[]): Promise<void> {
  await requireDb().bankAccounts.bulkPut(records.map((r) => ({ ...r, synced: true })));
}

export async function hydrateTransactions(records: LocalTransaction[]): Promise<void> {
  await requireDb().transactions.bulkPut(records.map((r) => ({ ...r, synced: true })));
}

export async function hydrateItems(records: LocalItem[]): Promise<void> {
  await requireDb().items.bulkPut(records.map((r) => ({ ...r, synced: true })));
}

export async function hydrateCashbookEntries(records: CashbookEntry[]): Promise<void> {
  await requireDb().cashbookEntries.bulkPut(records.map((r) => ({ ...r, synced: true })));
}

export async function hydrateBusinessSettings(
  record: LocalBusinessSettings | undefined
): Promise<void> {
  if (record) await requireDb().businessSettings.put({ ...record, synced: true });
}

export async function wipeLocalDatabase(): Promise<void> {
  await requireDb().transaction(
    "rw",
    [
      requireDb().customers,
      requireDb().bankAccounts,
      requireDb().transactions,
      requireDb().pendingDeletes,
      requireDb().photos,
      requireDb().items,
      requireDb().cashbookEntries,
      requireDb().businessSettings,
    ],
    async () => {
      await Promise.all([
        requireDb().customers.clear(),
        requireDb().bankAccounts.clear(),
        requireDb().transactions.clear(),
        requireDb().pendingDeletes.clear(),
        requireDb().photos.clear(),
        requireDb().items.clear(),
        requireDb().cashbookEntries.clear(),
        requireDb().businessSettings.clear(),
      ]);
    }
  );
}
