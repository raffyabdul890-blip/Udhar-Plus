import Icon from "@/components/icons/Icon";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search customers…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Icon
        name="search"
        size={19}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className="min-h-tap w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-senior-base text-ink placeholder:text-ink-tertiary transition focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
    </div>
  );
}
