"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { selectClassName } from "@/components/ui/TextField";
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
  const showToast = useToast();
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
    showToast("Profile saved");
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
          <label htmlFor="business-category" className="text-senior-base font-medium text-ink">
            Business category
          </label>
          <select
            id="business-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectClassName}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <p className="text-senior-xs text-ink-tertiary">Shop logo upload is planned for a follow-up update.</p>

        <Button type="submit" loading={saving} fullWidth>
          Save Profile
        </Button>
      </form>
    </Modal>
  );
}
