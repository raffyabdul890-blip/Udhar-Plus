"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import { addCustomer } from "@/lib/db/offlineStorage";

export default function AddCustomerModal({
  userId,
  onClose,
  onAdded,
}: {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Enter the customer's name.");
      return;
    }

    setSaving(true);
    await addCustomer({
      user_id: userId,
      name: name.trim(),
      description: description.trim() || undefined,
      current_balance: 0,
    });
    setSaving(false);
    onAdded();
    onClose();
  }

  return (
    <Modal title="Add Customer" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          id="customer-name"
          label="Customer name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ahmed General Store"
          autoFocus
        />
        <TextField
          id="customer-description"
          label="Note (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Regular customer, shop on Main Road"
        />

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
          disabled={saving}
          className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred disabled:bg-brand-charcoal disabled:text-brand-white/50"
        >
          {saving ? "Saving…" : "Save customer"}
        </button>
      </form>
    </Modal>
  );
}
