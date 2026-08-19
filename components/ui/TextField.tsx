import type { InputHTMLAttributes } from "react";

/** Shared className for raw <select> elements across the app — kept as one constant so every dropdown matches TextField's look. */
export const selectClassName =
  "min-h-tap w-full rounded-xl border border-border bg-surface px-4 text-senior-base text-ink transition focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

type TextFieldProps = {
  id: string;
  label: string;
} & InputHTMLAttributes<HTMLInputElement>;

export default function TextField({ id, label, className, ...props }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-senior-base font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`min-h-tap w-full rounded-xl border border-border bg-surface px-4 text-senior-base text-ink placeholder:text-ink-tertiary transition focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className ?? ""}`}
      />
    </div>
  );
}
