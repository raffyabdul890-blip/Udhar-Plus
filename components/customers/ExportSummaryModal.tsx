"use client";

import Modal from "@/components/ui/Modal";
import { buildLedgerRows, formatLedgerDate } from "@/lib/ledgerRows";
import { downloadCanvasAsPng, renderBillCanvas } from "@/lib/canvasBill";
import {
  buildLedgerSummaryMessage,
  buildWhatsAppUrl,
  formatWhatsAppNumber,
  isValidWhatsAppNumber,
} from "@/lib/whatsapp";
import type { LocalCustomer, LocalTransaction } from "@/lib/db/offlineStorage";

export default function ExportSummaryModal({
  customer,
  shopLabel,
  transactions,
  onClose,
}: {
  customer: LocalCustomer;
  shopLabel: string;
  transactions: LocalTransaction[];
  onClose: () => void;
}) {
  const rows = buildLedgerRows(transactions);
  const formattedPhone = customer.phone ? formatWhatsAppNumber(customer.phone) : "";
  const canShareWhatsApp = customer.phone && isValidWhatsAppNumber(formattedPhone);

  function handleShareWhatsApp() {
    if (!canShareWhatsApp) return;
    const recentLines = rows
      .slice(-5)
      .map(
        (row) =>
          `${formatLedgerDate(row.date)} · ${row.cashIn ? "Jama" : "Udhar"} Rs. ${(
            row.cashIn ?? row.cashOut ?? 0
          ).toLocaleString("en-PK")}`
      );
    const message = buildLedgerSummaryMessage(
      shopLabel,
      customer.name,
      customer.current_balance,
      recentLines
    );
    window.open(buildWhatsAppUrl(formattedPhone, message), "_blank", "noopener,noreferrer");
    onClose();
  }

  function handleDownloadBill() {
    const canvas = renderBillCanvas({
      shopLabel,
      customerName: customer.name,
      customerPhone: customer.phone,
      rows,
      netBalance: customer.current_balance,
    });
    downloadCanvasAsPng(canvas, `${customer.name.replace(/\s+/g, "-")}-ledger.png`);
    onClose();
  }

  return (
    <Modal title={`Share / Export — ${customer.name}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleShareWhatsApp}
          disabled={!canShareWhatsApp}
          className="min-h-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred disabled:bg-brand-charcoal disabled:text-brand-white/50"
        >
          💬 Share via WhatsApp
        </button>
        {!canShareWhatsApp && (
          <p className="text-senior-xs text-brand-white/60">
            Add a phone number via &ldquo;Send Reminder&rdquo; first to enable WhatsApp sharing.
          </p>
        )}

        <button
          type="button"
          onClick={handleDownloadBill}
          className="min-h-tap rounded-xl border border-brand-charcoal px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98]"
        >
          ⬇️ Download Bill
        </button>
      </div>
    </Modal>
  );
}
