"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { wipeLocalDatabase } from "@/lib/db/offlineStorage";
import Icon from "@/components/icons/Icon";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const { t } = usePreferences();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // A shared/family device must not retain a previous user's ledger data.
    await wipeLocalDatabase();
    router.push("/login");
    router.refresh();
  }

  const confirmDialog = confirming && (
    <ConfirmDialog
      title={t("settings.logoutConfirmTitle")}
      message={t("settings.logoutConfirmMessage")}
      confirmLabel={t("settings.logout")}
      onConfirm={handleLogout}
      onCancel={() => setConfirming(false)}
    />
  );

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={loading}
          aria-label={t("settings.logout")}
          className="flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-xl text-ink-secondary transition active:scale-95 active:bg-surface-alt disabled:text-ink-tertiary"
        >
          <Icon name="logout" size={21} />
        </button>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={loading}
        className="flex min-h-tap w-full items-center gap-3 rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-start text-senior-base font-bold text-danger-dark transition active:scale-[0.99]"
      >
        <Icon name="logout" size={19} />
        {loading ? "…" : t("settings.logout")}
      </button>
      {confirmDialog}
    </>
  );
}
