"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import { saveBusinessSettings, type LocalBusinessSettings } from "@/lib/db/offlineStorage";

const CATEGORIES = ["Kiryana", "Pharmacy", "Mobile Shop", "General Store", "Other"];

export default function BusinessProfileModal({
  userId,
  settings,
  onClose,
  onSaved,
}: {
  userId: string;
  settings: LocalBusinessSettings | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [businessName, setBusinessName] = useState(settings?.business_name ?? "");
  const [phone, setPhone] = useState(settings?.phone ?? "");
  const [address, setAddress] = useState(settings?.address ?? "");
  const [category, setCategory] = useState(settings?.category ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    await saveBusinessSettings(userId, {
      business_name: businessName.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      category: category || undefined,
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title="Business Profile" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          id="business-name"
          label="Business name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. Ahmed General Store"
          autoFocus
        />
        <TextField
          id="business-phone"
          label="Phone number"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03001234567"
        />
        <TextField
          id="business-address"
          label="Shop address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. Main Bazaar, Lahore"
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="business-category" className="text-senior-base font-medium text-brand-white">
            Business category
          </label>
          <select
            id="business-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-tap rounded-xl border border-brand-charcoal bg-brand-black px-4 text-senior-base text-brand-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <p className="text-senior-xs text-brand-white/50">
          Shop logo upload is planned for a follow-up update.
        </p>

        <button
          type="submit"
          disabled={saving}
          className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred disabled:bg-brand-charcoal disabled:text-brand-white/50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </Modal>
  );
}
