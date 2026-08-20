import { getFinancialInstitution } from "@/lib/constants/banks";

/**
 * A brand-colored identity tile — not a licensed bank logo image. Udhar Plus
 * doesn't have a logo-licensing agreement with any bank, so bundling real
 * trademarked artwork isn't something this component does; this is the
 * common, legitimate fallback pattern apps without one use: each
 * institution's own brand color plus a clean wordmark, on a rounded-square
 * tile (reads as an app/brand icon, not a generic avatar) with a soft
 * gradient and inner highlight for a touch of depth.
 */
const SIZE_CLASSES = {
  sm: "h-10 w-10 rounded-lg text-senior-xs",
  md: "h-12 w-12 rounded-xl text-senior-sm",
  lg: "h-14 w-14 rounded-xl text-senior-base",
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
  const color = institution?.color ?? "#6D4AFF";

  return (
    <div
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center overflow-hidden font-bold tracking-tight text-white shadow-card ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: color }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(155deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 55%)" }}
      />
      <span className="relative leading-none">{label}</span>
    </div>
  );
}
