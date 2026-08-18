"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingModal({
  onComplete,
}: {
  onComplete: (profile: { fullName: string; shopName: string | null }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Enter your name to continue.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        shop_name: shopName.trim() || null,
      },
    });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onComplete({ fullName: fullName.trim(), shopName: shopName.trim() || null });
  }

  return (
    <Modal title="Welcome to Udhar Plus" onClose={() => {}} dismissable={false}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-senior-base text-brand-white/80">
          Tell us a little about your shop before you get started.
        </p>

        <TextField
          id="onboarding-full-name"
          label="Full / Dukaandar name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Ahmed Khan"
          autoFocus
        />
        <TextField
          id="onboarding-shop-name"
          label="Shop name (optional)"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="e.g. Ahmed General Store"
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
          {saving ? "Saving…" : "Continue"}
        </button>
      </form>
    </Modal>
  );
}
