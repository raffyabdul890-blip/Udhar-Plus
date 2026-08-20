export default function TopNavbar({
  sectionTitle,
}: {
  /** Current tab's label, e.g. "Khata". The business name already lives in the desktop sidebar header and in Settings — repeating it above every mobile screen's title just added a line of clutter without much value on a single-account device. */
  sectionTitle: string;
}) {
  return (
    <h1 className="truncate text-senior-xl font-bold text-ink">{sectionTitle}</h1>
  );
}
