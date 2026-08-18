"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { markOnboardingCompleteLocally } from "@/lib/onboarding";

export default function OnboardingModal({
  userId,
  onComplete,
}: {
  userId: string;
  onComplete: () => void;
}) {
  const [agreed, setAgreed] = useState(false);

  function handleGetStarted() {
    // Local flag first (always succeeds, works offline) so entry to the app is
    // instant — the metadata write is best-effort and never blocks access.
    markOnboardingCompleteLocally(userId);
    onComplete();

    createClient()
      .auth.updateUser({ data: { terms_accepted: true, onboarding_completed: true } })
      .catch(() => {});
  }

  return (
    <Modal title="Welcome to Udhar Plus" onClose={() => {}} dismissable={false}>
      <div className="flex flex-col gap-4">
        <p className="text-senior-base text-brand-white/80">
          Please review and accept our Terms and Conditions to get started.
        </p>

        <label className="flex min-h-tap cursor-pointer items-center gap-3 text-senior-sm text-brand-white/80">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-5 w-5 shrink-0 rounded border-brand-charcoal accent-brand-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
          />
          <span>I agree to the Terms and Conditions</span>
        </label>

        <button
          type="button"
          onClick={handleGetStarted}
          disabled={!agreed}
          className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred disabled:bg-brand-charcoal disabled:text-brand-white/50"
        >
          Get Started
        </button>
      </div>
    </Modal>
  );
}
