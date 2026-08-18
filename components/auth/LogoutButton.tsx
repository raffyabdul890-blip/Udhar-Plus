"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { wipeLocalDatabase } from "@/lib/db/offlineStorage";

export default function LogoutButton() {
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

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="min-h-tap min-w-tap rounded-xl border border-brand-charcoal bg-brand-charcoal px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:text-brand-white/50"
    >
      {loading ? "Logging out…" : "Logout"}
    </button>
  );
}
