"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
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

  async function handleOpenWhatsApp(event: FormEvent) {
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
          <label htmlFor="whatsapp-message" className="text-senior-base font-medium text-brand-white">
            Message (editable)
          </label>
          <textarea
            id="whatsapp-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="min-h-tap rounded-xl border border-brand-charcoal bg-brand-black/40 p-4 text-senior-sm text-brand-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-brand-red bg-brand-charcoal px-4 py-3 text-senior-sm font-medium text-brand-white"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred"
        >
          Open WhatsApp
        </button>
      </form>
    </Modal>
  );
}
