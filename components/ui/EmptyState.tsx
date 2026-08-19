import Icon, { type IconName } from "@/components/icons/Icon";
import Button from "@/components/ui/Button";

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
        <Icon name={icon} size={26} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-senior-base font-bold text-ink">{title}</p>
        {description && <p className="text-senior-sm text-ink-secondary">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
