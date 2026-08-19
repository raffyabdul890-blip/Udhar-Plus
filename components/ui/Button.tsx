"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import Icon, { type IconName } from "@/components/icons/Icon";

type Variant = "primary" | "success" | "warning" | "danger" | "secondary" | "ghost";
type Size = "md" | "sm";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary text-white active:bg-primary-dark disabled:bg-surface-alt disabled:text-ink-tertiary",
  success: "bg-success text-white active:bg-success-dark disabled:bg-surface-alt disabled:text-ink-tertiary",
  // Solid warm CTA for legitimate "negative" actions (Give Udhaar, Cash Out) —
  // distinct from the soft `danger` variant, which is reserved for destructive delete/remove.
  warning: "bg-warning text-white active:bg-warning/85 disabled:bg-surface-alt disabled:text-ink-tertiary",
  danger: "bg-danger-light text-danger active:bg-danger/20 disabled:bg-surface-alt disabled:text-ink-tertiary",
  secondary: "bg-primary-light text-primary active:bg-primary/20 disabled:bg-surface-alt disabled:text-ink-tertiary",
  ghost: "bg-transparent text-ink-secondary active:bg-surface-alt disabled:text-ink-tertiary",
};

const RIPPLE_CLASSES: Record<Variant, string> = {
  primary: "bg-white/40",
  success: "bg-white/40",
  warning: "bg-white/40",
  danger: "bg-danger/25",
  secondary: "bg-primary/20",
  ghost: "bg-ink/10",
};

const SIZE_CLASSES: Record<Size, string> = {
  md: "min-h-tap px-6 text-senior-base",
  sm: "min-h-[40px] px-4 text-senior-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: IconName;
  children?: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.4;
    const id = Date.now() + Math.random();
    setRipples((prev) => [
      ...prev,
      { id, x: event.clientX - rect.left - size / 2, y: event.clientY - rect.top - size / 2, size },
    ]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 500);
  }

  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      onPointerDown={(e) => {
        handlePointerDown(e);
        props.onPointerDown?.(e);
      }}
      className={`relative flex items-center justify-center gap-2 overflow-hidden rounded-xl font-bold transition-colors duration-150 active:scale-[0.98] disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? "w-full" : "min-w-tap"} ${className ?? ""}`}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className={`pointer-events-none absolute animate-ripple rounded-full ${RIPPLE_CLASSES[variant]}`}
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
          />
          <span>Saving…</span>
        </>
      ) : (
        <>
          {icon && <Icon name={icon} size={size === "sm" ? 18 : 20} />}
          {children}
        </>
      )}
    </button>
  );
}
