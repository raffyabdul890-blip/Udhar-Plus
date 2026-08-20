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
    <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-surface px-5 py-7 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-primary">
        <Icon name={icon} size={20} />
      </div>
      <div className="flex flex-col gap-0.5">
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
