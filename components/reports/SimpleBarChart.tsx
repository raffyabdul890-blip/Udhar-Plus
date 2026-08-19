/**
 * Dependency-free horizontal bar chart — plain divs sized by percentage, no
 * canvas/SVG/charting library. Deliberately simple: this app's numbers matter
 * more than the chart (see FRONTEND_UI.md).
 */
export default function SimpleBarChart({
  bars,
}: {
  bars: { label: string; value: number; colorClassName?: string }[];
}) {
  const max = Math.max(1, ...bars.map((b) => Math.abs(b.value)));

  if (bars.every((b) => b.value === 0)) {
    return <p className="text-senior-sm text-ink-secondary">Not enough data yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {bars.map((bar) => {
        const widthPct = Math.max(2, (Math.abs(bar.value) / max) * 100);
        return (
          <div key={bar.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-senior-sm">
              <span className="truncate font-medium text-ink-secondary">{bar.label}</span>
              <span className="shrink-0 font-bold text-ink">{bar.value.toLocaleString("en-PK")}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-alt">
              <div
                className={`h-full rounded-full transition-all duration-500 ${bar.colorClassName ?? "bg-primary"}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
