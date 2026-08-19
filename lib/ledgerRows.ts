import { compareTransactionDates } from "@/lib/utils/datetime";
import type { LocalTransaction } from "@/lib/db/offlineStorage";

export interface LedgerRow {
  date: string;
  description: string;
  cashIn: number | null;
  cashOut: number | null;
  runningBalance: number;
}

/** Chronological (oldest first) rows with a running balance — customer entries only. */
export function buildLedgerRows(transactions: LocalTransaction[]): LedgerRow[] {
  const chronological = [...transactions].sort(compareTransactionDates);

  let balance = 0;
  return chronological.map((txn) => {
    balance += txn.type === "OUT" ? txn.amount : -txn.amount;
    return {
      date: txn.transaction_date,
      description: txn.note || (txn.type === "IN" ? "Payment received" : "Credit given"),
      cashIn: txn.type === "IN" ? txn.amount : null,
      cashOut: txn.type === "OUT" ? txn.amount : null,
      runningBalance: balance,
    };
  });
}

export function formatLedgerDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
