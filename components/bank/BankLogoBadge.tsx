import { getFinancialInstitution } from "@/lib/constants/banks";

const SIZE_CLASSES = {
  sm: "h-10 w-10 text-senior-xs",
  md: "h-12 w-12 text-senior-sm",
} as const;

export default function BankLogoBadge({
  bankCode,
  size = "md",
}: {
  bankCode: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const institution = getFinancialInstitution(bankCode);
  const label = institution?.shortLabel ?? bankCode.slice(0, 3).toUpperCase();

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-brand-white ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: institution?.color ?? "#574D4C" }}
    >
      {label}
    </div>
  );
}
