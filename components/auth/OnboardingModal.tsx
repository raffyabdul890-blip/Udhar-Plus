"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";
import { markOnboardingCompleteLocally } from "@/lib/onboarding";

type Profile = { fullName: string | null; shopName: string | null };

export default function OnboardingModal({
  userId,
  onComplete,
}: {
  userId: string;
  onComplete: (profile: Profile) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function finish(profile: Profile) {
    markOnboardingCompleteLocally(userId);
    onComplete(profile);
  }

  function handleSkip() {
    // Best-effort — the local flag alone is enough to never show this again on
    // this device, even if there's no connection to reach Supabase right now.
    createClient()
      .auth.updateUser({ data: { onboarding_completed: true } })
      .catch(() => {});
    finish({ fullName: null, shopName: null });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!agreed) {
      setError("Please agree to the Terms and Conditions to continue.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim() || null,
        shop_name: shopName.trim() || null,
        onboarding_completed: true,
        terms_accepted_at: new Date().toISOString(),
      },
    });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    finish({ fullName: fullName.trim() || null, shopName: shopName.trim() || null });
  }

  return (
    <Modal title="Welcome to Udhar Plus" onClose={handleSkip}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-senior-base text-brand-white/80">
          Add your shop details now, or skip and explore the app first — you can always set
          these up later.
        </p>

        <TextField
          id="onboarding-full-name"
          label="Full / Dukaandar name (optional)"
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

        <label className="flex min-h-tap cursor-pointer items-center gap-3 text-senior-sm text-brand-white/80">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-5 w-5 shrink-0 rounded border-brand-charcoal accent-brand-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
          />
          <span>I agree with Terms and Conditions</span>
        </label>

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
          {saving ? "Saving…" : "Get Started"}
        </button>

        <button
          type="button"
          onClick={handleSkip}
          className="min-h-tap text-senior-sm font-medium text-brand-white/80 underline"
        >
          Skip for now
        </button>
      </form>
    </Modal>
  );
}
