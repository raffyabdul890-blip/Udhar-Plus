import type { InputHTMLAttributes } from "react";

type TextFieldProps = {
  id: string;
  label: string;
} & InputHTMLAttributes<HTMLInputElement>;

export default function TextField({ id, label, className, ...props }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-senior-base font-medium text-brand-white">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`min-h-tap rounded-xl border border-brand-charcoal bg-transparent px-4 text-senior-base text-brand-white placeholder:text-brand-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white ${className ?? ""}`}
      />
    </div>
  );
}
