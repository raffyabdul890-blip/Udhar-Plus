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
    return <p className="text-senior-sm text-brand-white/60">Not enough data yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {bars.map((bar) => {
        const widthPct = Math.max(2, (Math.abs(bar.value) / max) * 100);
        return (
          <div key={bar.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-senior-sm">
              <span className="truncate font-medium text-brand-white/90">{bar.label}</span>
              <span className="shrink-0 font-bold text-brand-white">
                {bar.value.toLocaleString("en-PK")}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-brand-black/40">
              <div
                className={`h-full rounded-full ${bar.colorClassName ?? "bg-brand-red"}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
