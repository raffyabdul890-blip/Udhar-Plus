import LogoutButton from "@/components/auth/LogoutButton";

export default function TopNavbar({ primaryLabel }: { primaryLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex-1 truncate text-senior-xl font-bold text-brand-white">
        {primaryLabel}
      </span>
      <LogoutButton />
    </div>
  );
}
