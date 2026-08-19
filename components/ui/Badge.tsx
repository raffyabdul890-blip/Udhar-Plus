type Variant = "success" | "danger" | "primary" | "warning" | "neutral";

const VARIANT_CLASSES: Record<Variant, string> = {
  success: "bg-success-light text-success-dark",
  danger: "bg-danger-light text-danger-dark",
  primary: "bg-primary-light text-primary",
  warning: "bg-warning-light text-warning",
  neutral: "bg-surface-alt text-ink-secondary",
};

export default function Badge({
  variant = "neutral",
  children,
  className,
}: {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-senior-xs font-bold ${VARIANT_CLASSES[variant]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
