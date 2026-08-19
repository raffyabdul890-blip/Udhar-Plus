const TINTS = [
  "bg-primary-light text-primary",
  "bg-success-light text-success-dark",
  "bg-warning-light text-warning",
  "bg-danger-light text-danger-dark",
];

function tintFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

const SIZE_CLASSES = {
  sm: "h-10 w-10 text-senior-sm",
  md: "h-12 w-12 text-senior-base",
  lg: "h-16 w-16 text-senior-xl",
} as const;

export default function AvatarInitial({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${tintFor(name)} ${SIZE_CLASSES[size]} ${className ?? ""}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}
