export default function TopNavbar({
  primaryLabel,
  sectionTitle,
}: {
  primaryLabel: string;
  /** Current tab's label, e.g. "Khata" — gives mobile users orientation since the sidebar is hidden there. */
  sectionTitle: string;
}) {
  return (
    <div className="overflow-hidden">
      <p className="truncate text-senior-xs font-medium text-ink-tertiary lg:hidden">{primaryLabel}</p>
      <h1 className="truncate text-senior-xl font-bold text-ink">{sectionTitle}</h1>
    </div>
  );
}
