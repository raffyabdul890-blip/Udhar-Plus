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
        <p className="rounded-xl border border-brand-charcoal bg-brand-black/40 p-3 text-senior-xs text-brand-white/60">
          {LEGAL_DISCLAIMER}
        </p>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-senior-sm text-brand-white/80">
            {paragraph}
          </p>
        ))}
      </div>
    </Modal>
  );
}
