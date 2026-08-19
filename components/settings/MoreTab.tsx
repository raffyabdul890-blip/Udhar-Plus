"use client";

import { useCallback, useEffect, useState } from "react";
import Icon, { type IconName } from "@/components/icons/Icon";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/ToastProvider";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import BusinessProfileModal from "@/components/settings/BusinessProfileModal";
import LegalModal from "@/components/settings/LegalModal";
import { getBusinessSettings, saveBusinessSettings, type LocalBusinessSettings } from "@/lib/db/offlineStorage";
import { syncPendingRecords } from "@/lib/sync/syncEngine";
import { TERMS_PARAGRAPHS, PRIVACY_PARAGRAPHS } from "@/lib/legalContent";

function Row({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-tap w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left transition active:scale-[0.99] active:bg-surface-alt"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
        <Icon name={icon} size={18} />
      </span>
      <div className="flex-1 overflow-hidden">
        <p className="text-senior-base font-bold text-ink">{title}</p>
        {detail && <p className="truncate text-senior-sm text-ink-secondary">{detail}</p>}
      </div>
      <Icon name="chevron-right" size={18} className="shrink-0 text-ink-tertiary" />
    </button>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="px-1 text-senior-xs font-bold uppercase tracking-wide text-ink-tertiary">{children}</h2>;
}

export default function MoreTab({
  userId,
  onNavigateToTab,
}: {
  userId: string;
  /** Mobile's bottom nav only fits 5 destinations — Sales/Reports/Bank & Wallet live here instead. */
  onNavigateToTab: (tab: "sales" | "reports" | "bank") => void;
}) {
  const showToast = useToast();
  const [settings, setSettings] = useState<LocalBusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async () => {
    setSettings((await getBusinessSettings(userId)) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Synchronizing with IndexedDB (an external store), not deriving state from props —
    // the textbook valid effect use case, just one the new lint rule can't tell apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  useEffect(() => {
    // Read post-mount (not in a lazy useState initializer) to avoid a hydration
    // mismatch — SSR always renders "online", corrected here on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  async function handleLanguageChange(language: "en" | "ur") {
    const updated = await saveBusinessSettings(userId, { language });
    setSettings(updated);
  }

  async function handleSyncNow() {
    setSyncing(true);
    await syncPendingRecords(userId);
    setSyncing(false);
    showToast("Synced");
  }

  if (loading) {
    return <CustomerCardSkeletonList count={3} label="Loading settings" />;
  }

  const language = settings?.language ?? "en";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 lg:hidden">
        <SectionHeader>More Tools</SectionHeader>
        <Row icon="sales" title="Sales" detail="Itemized billing history" onClick={() => onNavigateToTab("sales")} />
        <Row icon="reports" title="Reports" detail="Business performance" onClick={() => onNavigateToTab("reports")} />
        <Row icon="bank" title="Bank & Wallet" detail="Manual accounts ledger" onClick={() => onNavigateToTab("bank")} />
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeader>Business</SectionHeader>
        <Row
          icon="user"
          title="Business Profile"
          detail={settings?.business_name || "Set your business name, address & category"}
          onClick={() => setShowProfile(true)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeader>Data</SectionHeader>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-senior-base font-bold text-ink">Data Backup</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={online ? "success" : "neutral"}>{online ? "Online" : "Offline"}</Badge>
                <p className="text-senior-sm text-ink-secondary">
                  {online ? "Syncs automatically" : "Will sync when back online"}
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleSyncNow} disabled={syncing || !online}>
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeader>Preferences</SectionHeader>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-senior-base font-bold text-ink">Language</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => handleLanguageChange("en")}
              aria-pressed={language === "en"}
              className={`min-h-tap flex-1 rounded-lg text-senior-sm font-bold transition-colors ${
                language === "en" ? "bg-primary text-white" : "bg-surface-alt text-ink-secondary"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange("ur")}
              aria-pressed={language === "ur"}
              className={`min-h-tap flex-1 rounded-lg text-senior-sm font-bold transition-colors ${
                language === "ur" ? "bg-primary text-white" : "bg-surface-alt text-ink-secondary"
              }`}
            >
              اردو
            </button>
          </div>
          <p className="mt-2 text-senior-xs text-ink-tertiary">
            Switches Diye/Milay-style labels app-wide. Full translation is planned for a follow-up update.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeader>Security</SectionHeader>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-senior-base font-bold text-ink">Theme</p>
          <p className="mt-1 text-senior-sm text-ink-secondary">Light (senior-accessible, high contrast)</p>
          <p className="mt-1 text-senior-xs text-ink-tertiary">
            A deliberate accessibility choice — clean, high-contrast, easy to read in daylight. Additional
            themes meeting the same contrast bar may come later.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeader>Legal &amp; Help</SectionHeader>
        <Row icon="file-text" title="Terms & Conditions" onClick={() => setShowTerms(true)} />
        <Row icon="shield" title="Privacy Policy" onClick={() => setShowPrivacy(true)} />
      </div>

      {showProfile && (
        <BusinessProfileModal userId={userId} settings={settings} onClose={() => setShowProfile(false)} onSaved={reload} />
      )}
      {showTerms && (
        <LegalModal title="Terms & Conditions" paragraphs={TERMS_PARAGRAPHS} onClose={() => setShowTerms(false)} />
      )}
      {showPrivacy && (
        <LegalModal title="Privacy Policy" paragraphs={PRIVACY_PARAGRAPHS} onClose={() => setShowPrivacy(false)} />
      )}
    </div>
  );
}
