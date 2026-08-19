import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-senior-base text-ink-secondary">{message}</p>
      <div className="flex gap-3">
        <Button variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" fullWidth onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
