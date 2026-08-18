"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { initSyncEngine } from "@/lib/sync/syncEngine";

/**
 * Mounted once in the root layout. Starts/stops the background sync manager
 * as the Supabase auth session comes and goes — no manual backup button needed.
 */
export default function SyncManagerMount() {
  useEffect(() => {
    const supabase = createClient();
    let cleanup: (() => void) | null = null;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      cleanup?.();
      cleanup = session?.user ? initSyncEngine(session.user.id) : null;
    });

    return () => {
      cleanup?.();
      listener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
