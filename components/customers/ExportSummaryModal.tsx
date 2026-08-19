"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import WhatsAppReminderModal from "@/components/customers/WhatsAppReminderModal";
import { buildLedgerRows, formatLedgerDate } from "@/lib/ledgerRows";
import { downloadCanvasAsPng, renderBillCanvas } from "@/lib/canvasBill";
import { buildLedgerSummaryMessage } from "@/lib/whatsapp";
import type { LocalCustomer, LocalTransaction } from "@/lib/db/offlineStorage";

export default function ExportSummaryModal({
  customer,
  shopLabel,
  transactions,
  onClose,
  onSaved,
}: {
  customer: LocalCustomer;
  shopLabel: string;
  transactions: LocalTransaction[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const rows = buildLedgerRows(transactions);
  const canShareWhatsApp = Boolean(customer.phone);

  function buildSummaryMessage() {
    const recentLines = rows
      .slice(-5)
      .map(
        (row) =>
          `${formatLedgerDate(row.date)} · ${row.cashIn ? "Jama" : "Udhar"} Rs. ${(
            row.cashIn ?? row.cashOut ?? 0
          ).toLocaleString("en-PK")}`
      );
    return buildLedgerSummaryMessage(shopLabel, customer.name, customer.current_balance, recentLines);
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

  if (showWhatsApp) {
    return (
      <WhatsAppReminderModal
        customer={customer}
        title={`Share Statement with ${customer.name}`}
        presetMessage={buildSummaryMessage()}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  return (
    <Modal title={`Share / Export — ${customer.name}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Button icon="whatsapp" fullWidth onClick={() => setShowWhatsApp(true)} disabled={!canShareWhatsApp}>
          Share via WhatsApp
        </Button>
        {!canShareWhatsApp && (
          <p className="text-senior-xs text-ink-secondary">
            Add a phone number via &ldquo;Remind&rdquo; first to enable WhatsApp sharing.
          </p>
        )}

        <Button variant="secondary" icon="download" fullWidth onClick={handleDownloadBill}>
          Download Bill
        </Button>
      </div>
    </Modal>
  );
}
