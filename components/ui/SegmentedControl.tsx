export default function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-senior-base font-medium text-ink">{label}</span>
      <div role="tablist" aria-label={label} className="flex gap-1 rounded-xl bg-surface-alt p-1">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option.value)}
              className={`min-h-tap flex-1 rounded-lg px-3 text-senior-sm font-bold transition-all duration-150 ${
                active ? "bg-surface text-primary shadow-card" : "text-ink-secondary"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
