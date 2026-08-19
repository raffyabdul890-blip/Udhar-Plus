export type DateRangePreset = "today" | "yesterday" | "week" | "month" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Monday-start calendar week. */
function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

/**
 * Resolves a preset (or an explicit custom start/end, both "YYYY-MM-DD") to a
 * concrete [start, end] range in local time. "week"/"month" are calendar
 * periods (Monday-start week), not rolling N-day windows.
 */
export function resolveDateRange(
  preset: DateRangePreset,
  custom?: { start: string; end: string }
): DateRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "week":
      return { start: startOfWeek(now), end: endOfDay(now) };
    case "month":
      return { start: startOfMonth(now), end: endOfDay(now) };
    case "custom": {
      if (!custom?.start || !custom?.end) return { start: startOfDay(now), end: endOfDay(now) };
      return { start: startOfDay(new Date(custom.start)), end: endOfDay(new Date(custom.end)) };
    }
  }
}

export function isWithinRange(iso: string, range: DateRange): boolean {
  const t = new Date(iso).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

export function isBeforeRange(iso: string, range: DateRange): boolean {
  return new Date(iso).getTime() < range.start.getTime();
}

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This Week",
  month: "This Month",
  custom: "Custom Range",
};
