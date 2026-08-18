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
