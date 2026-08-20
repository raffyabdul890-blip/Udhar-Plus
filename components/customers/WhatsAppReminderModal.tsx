"use client";

import { useState, type SubmitEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { updateCustomer, type LocalCustomer } from "@/lib/db/offlineStorage";
import {
  buildReminderMessage,
  buildWhatsAppUrl,
  formatWhatsAppNumber,
  isValidWhatsAppNumber,
} from "@/lib/whatsapp";

export default function WhatsAppReminderModal({
  customer,
  title,
  presetMessage,
  onClose,
  onSaved,
}: {
  customer: LocalCustomer;
  /** Modal title override — defaults to the balance-reminder wording. */
  title?: string;
  /** Pre-filled message (e.g. an itemized receipt) — defaults to the balance reminder. */
  presetMessage?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [message, setMessage] = useState(
    presetMessage ?? buildReminderMessage(customer.name, customer.current_balance)
  );
  const [error, setError] = useState<string | null>(null);

  async function handleOpenWhatsApp(event: SubmitEvent) {
    event.preventDefault();
    setError(null);

    const formatted = formatWhatsAppNumber(phone);
    if (!isValidWhatsAppNumber(formatted)) {
      setError("Enter a valid WhatsApp number, e.g. 03001234567.");
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone !== (customer.phone ?? "")) {
      await updateCustomer(customer.id, { phone: trimmedPhone });
      onSaved();
    }

    window.open(buildWhatsAppUrl(formatted, message), "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <Modal title={title ?? `Send WhatsApp Reminder to ${customer.name}`} onClose={onClose}>
      <form onSubmit={handleOpenWhatsApp} className="flex flex-col gap-4">
        <TextField
          id="whatsapp-phone"
          label="WhatsApp / phone number"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03001234567"
          autoFocus
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="whatsapp-message" className="text-senior-base font-medium text-ink">
            Message (editable)
          </label>
          <textarea
            id="whatsapp-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="min-h-tap w-full rounded-xl border border-border bg-surface-alt p-4 text-senior-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-senior-sm font-medium text-danger-dark">
            {error}
          </p>
        )}

        <Button type="submit" icon="whatsapp" fullWidth className="sticky bottom-0 bg-surface">
          Open WhatsApp
        </Button>
      </form>
    </Modal>
  );
}
