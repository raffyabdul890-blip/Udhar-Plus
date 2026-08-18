function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Formats a Date for an `<input type="datetime-local">` value, in local time. */
export function toDatetimeLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** Converts a `<input type="datetime-local">` value back to an ISO string for storage. */
export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

/**
 * Ascending chronological comparator for transactions. `transaction_date` only has
 * minute precision (from the datetime-local input), so two entries added within the
 * same minute compare equal on it alone — falling back to `created_at` (full
 * millisecond precision) keeps same-minute entries in the order they were actually
 * recorded instead of an arbitrary tie-break. Reverse the arguments for descending.
 */
export function compareTransactionDates(
  a: { transaction_date: string; created_at: string },
  b: { transaction_date: string; created_at: string }
): number {
  if (a.transaction_date !== b.transaction_date) {
    return a.transaction_date < b.transaction_date ? -1 : 1;
  }
  return a.created_at < b.created_at ? -1 : 1;
}
