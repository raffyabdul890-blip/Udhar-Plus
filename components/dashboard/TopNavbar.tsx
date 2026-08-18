import LogoutButton from "@/components/auth/LogoutButton";

export default function TopNavbar({
  primaryLabel,
  secondaryLabel,
}: {
  primaryLabel: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-1 flex-col overflow-hidden">
        <span className="truncate text-senior-xl font-bold text-brand-white">{primaryLabel}</span>
        {secondaryLabel && (
          <span className="truncate text-senior-sm text-brand-white/70">{secondaryLabel}</span>
        )}
      </div>
      <LogoutButton />
    </div>
  );
}
