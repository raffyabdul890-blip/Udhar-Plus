"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { wipeLocalDatabase } from "@/lib/db/offlineStorage";
import Icon from "@/components/icons/Icon";

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // A shared/family device must not retain a previous user's ledger data.
    await wipeLocalDatabase();
    router.push("/login");
    router.refresh();
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        aria-label="Logout"
        className="flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-xl text-ink-secondary transition active:scale-95 active:bg-surface-alt disabled:text-ink-tertiary"
      >
        <Icon name="logout" size={21} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex min-h-tap min-w-tap items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 text-senior-base font-bold text-ink-secondary transition active:scale-[0.98] active:bg-surface-alt disabled:text-ink-tertiary"
    >
      <Icon name="logout" size={19} />
      {loading ? "Logging out…" : "Logout"}
    </button>
  );
}
