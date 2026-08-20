"use client";

import Icon from "@/components/icons/Icon";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

/** Subtle, non-blocking status strip — shown only while offline, everywhere in the shell. New entries still save instantly to IndexedDB; this just sets expectations about sync. */
export default function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-warning-light px-3 py-2 text-senior-xs font-bold text-warning"
    >
      <Icon name="alert-triangle" size={14} />
      Offline — saved locally, will sync automatically
    </div>
  );
}
