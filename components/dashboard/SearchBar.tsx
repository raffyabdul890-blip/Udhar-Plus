export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search customers, banks, accounts, amounts…"
      aria-label="Search"
      className="min-h-tap w-full rounded-xl border border-brand-charcoal bg-brand-charcoal/40 px-4 text-senior-base text-brand-white placeholder:text-brand-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
    />
  );
}
