import Modal from "@/components/ui/Modal";

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
      <p className="text-senior-base text-brand-white/80">{message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-tap min-w-tap flex-1 rounded-xl bg-brand-charcoal px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-tap min-w-tap flex-1 rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
