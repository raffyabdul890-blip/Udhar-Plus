import Modal from "@/components/ui/Modal";
import { LEGAL_DISCLAIMER } from "@/lib/legalContent";

export default function LegalModal({
  title,
  paragraphs,
  onClose,
}: {
  title: string;
  paragraphs: string[];
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto">
        <p className="rounded-xl border border-border bg-surface-alt p-3 text-senior-xs text-ink-secondary">
          {LEGAL_DISCLAIMER}
        </p>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-senior-sm text-ink-secondary">
            {paragraph}
          </p>
        ))}
      </div>
    </Modal>
  );
}
