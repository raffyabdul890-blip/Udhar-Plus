"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
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
        <p className="text-senior-base text-ink-secondary">
          Please review and accept our Terms and Conditions to get started.
        </p>

        <label className="flex min-h-tap cursor-pointer items-center gap-3 text-senior-sm text-ink-secondary">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-5 w-5 shrink-0 rounded border-border accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <span>I agree to the Terms and Conditions</span>
        </label>

        <Button onClick={handleGetStarted} disabled={!agreed} fullWidth>
          Get Started
        </Button>
      </div>
    </Modal>
  );
}
