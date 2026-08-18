import Dexie, { type Table } from "dexie";

export interface LocalCustomer {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  current_balance: number;
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

export interface LocalTransaction {
  id: string;
  user_id: string;
  entity_type: "customer" | "bank";
  entity_id: string;
  type: "IN" | "OUT";
  amount: number;
  note?: string;
  transaction_date: string;
  created_at: string;
  synced: boolean;
}

export type LocalEntityTable = "customers" | "bankAccounts" | "transactions";

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

export async function getPendingDeletes(): Promise<PendingDelete[]> {
  return requireDb().pendingDeletes.toArray();
}

export async function clearPendingDelete(id: string): Promise<void> {
  await requireDb().pendingDeletes.delete(id);
}

export async function markSynced(table: LocalEntityTable, id: string): Promise<void> {
  await requireDb()[table].update(id, { synced: true } as Partial<
    LocalCustomer | LocalBankAccount | LocalTransaction
  >);
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

export async function wipeLocalDatabase(): Promise<void> {
  await requireDb().transaction(
    "rw",
    requireDb().customers,
    requireDb().bankAccounts,
    requireDb().transactions,
    requireDb().pendingDeletes,
    async () => {
      await Promise.all([
        requireDb().customers.clear(),
        requireDb().bankAccounts.clear(),
        requireDb().transactions.clear(),
        requireDb().pendingDeletes.clear(),
      ]);
    }
  );
}
