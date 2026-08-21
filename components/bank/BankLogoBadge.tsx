import { getFinancialInstitution } from "@/lib/constants/banks";

/**
 * A brand-colored identity tile — not a licensed bank logo image. Udhar Plus
 * doesn't have a logo-licensing agreement with any bank, so bundling real
 * trademarked artwork isn't something this component does; this is the
 * common, legitimate fallback pattern apps without one use: each
 * institution's own brand color plus a clean wordmark, on a rounded-square
 * tile (reads as an app/brand icon, not a generic avatar). A soft diagonal
 * gradient, an inset highlight ring, and a subtle bottom shadow give it the
 * layered, tactile look of a real payment-card/app icon rather than a flat
 * colored circle with letters.
 */
const SIZE_CLASSES = {
  sm: "h-10 w-10 rounded-[11px] text-[0.65rem]",
  md: "h-12 w-12 rounded-xl text-senior-xs",
  lg: "h-14 w-14 rounded-xl text-senior-sm",
} as const;

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

export default function BankLogoBadge({
  bankCode,
  size = "md",
}: {
  bankCode: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const institution = getFinancialInstitution(bankCode);
  const label = institution?.shortLabel ?? bankCode.slice(0, 3).toUpperCase();
  const color = institution?.color ?? "#0369A1";
  const textColor = isLightColor(color) ? "#171717" : "#ffffff";

  return (
    <div
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center overflow-hidden font-extrabold uppercase tracking-tight shadow-card ${SIZE_CLASSES[size]}`}
      style={{
        backgroundColor: color,
        color: textColor,
        boxShadow: "0 2px 6px -1px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(155deg, rgba(255,255,255,0.32), rgba(255,255,255,0) 60%)" }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15" />
      <span className="relative leading-none [font-stretch:condensed]">{label}</span>
    </div>
  );
}
