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
      <span className="text-senior-base font-medium text-brand-white">{label}</span>
      <div className="flex gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`min-h-tap flex-1 rounded-xl px-3 text-senior-sm font-bold transition ${
                active ? "bg-brand-red text-brand-white" : "bg-brand-charcoal text-brand-white/80"
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
