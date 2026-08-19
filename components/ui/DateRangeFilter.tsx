"use client";

import { useState } from "react";
import Icon from "@/components/icons/Icon";
import { DATE_RANGE_LABELS, type DateRangePreset } from "@/lib/utils/dateRange";

export default function DateRangeFilter({
  presets,
  value,
  customRange,
  onChange,
}: {
  /** Which presets to offer, in display order — Cashbook and Reports show slightly different sets. */
  presets: DateRangePreset[];
  value: DateRangePreset;
  customRange: { start: string; end: string };
  onChange: (preset: DateRangePreset, customRange: { start: string; end: string }) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);

  function selectPreset(preset: DateRangePreset) {
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    onChange(preset, customRange);
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="tablist" aria-label="Date range" className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const selected = preset === "custom" ? showCustom || value === "custom" : value === preset;
          return (
            <button
              key={preset}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectPreset(preset)}
              className={`flex min-h-tap items-center gap-1.5 rounded-xl px-4 text-senior-sm font-bold transition-colors ${
                selected ? "bg-primary text-white" : "bg-surface-alt text-ink-secondary"
              }`}
            >
              {preset === "custom" && <Icon name="calendar" size={16} />}
              {DATE_RANGE_LABELS[preset]}
            </button>
          );
        })}
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="date-range-start" className="text-senior-xs font-medium text-ink-secondary">
              From
            </label>
            <input
              id="date-range-start"
              type="date"
              value={customRange.start}
              onChange={(e) => onChange("custom", { ...customRange, start: e.target.value })}
              className="min-h-tap rounded-lg border border-border bg-surface px-3 text-senior-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="date-range-end" className="text-senior-xs font-medium text-ink-secondary">
              To
            </label>
            <input
              id="date-range-end"
              type="date"
              value={customRange.end}
              onChange={(e) => onChange("custom", { ...customRange, end: e.target.value })}
              className="min-h-tap rounded-lg border border-border bg-surface px-3 text-senior-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}
