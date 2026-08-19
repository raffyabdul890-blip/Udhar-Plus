"use client";

import { useCallback, useEffect, useState } from "react";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import BusinessProfileModal from "@/components/settings/BusinessProfileModal";
import LegalModal from "@/components/settings/LegalModal";
import { getBusinessSettings, saveBusinessSettings, type LocalBusinessSettings } from "@/lib/db/offlineStorage";
import { syncPendingRecords } from "@/lib/sync/syncEngine";
import { TERMS_PARAGRAPHS, PRIVACY_PARAGRAPHS } from "@/lib/legalContent";

export default function MoreTab({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<LocalBusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
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
  }

  if (loading) {
    return <CustomerCardSkeletonList count={3} label="Loading settings" />;
  }

  const language = settings?.language ?? "en";

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setShowProfile(true)}
        className="flex min-h-tap w-full items-center justify-between gap-3 rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-4 text-left transition active:scale-[0.99]"
      >
        <div className="overflow-hidden">
          <p className="text-senior-base font-bold text-brand-white">Business Profile</p>
          <p className="truncate text-senior-sm text-brand-white/60">
            {settings?.business_name || "Set your business name, address & category"}
          </p>
        </div>
        <span aria-hidden="true" className="shrink-0 text-senior-lg text-brand-white/50">
          ›
        </span>
      </button>

      <div className="rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-4">
        <p className="text-senior-base font-bold text-brand-white">Language</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => handleLanguageChange("en")}
            aria-pressed={language === "en"}
            className={`min-h-tap flex-1 rounded-lg text-senior-sm font-bold transition ${
              language === "en" ? "bg-brand-red text-brand-white" : "bg-brand-black/40 text-brand-white/70"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => handleLanguageChange("ur")}
            aria-pressed={language === "ur"}
            className={`min-h-tap flex-1 rounded-lg text-senior-sm font-bold transition ${
              language === "ur" ? "bg-brand-red text-brand-white" : "bg-brand-black/40 text-brand-white/70"
            }`}
          >
            اردو
          </button>
        </div>
        <p className="mt-2 text-senior-xs text-brand-white/50">
          Switches Diye/Milay-style labels app-wide. Full translation is planned for a follow-up
          update.
        </p>
      </div>

      <div className="rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-4">
        <p className="text-senior-base font-bold text-brand-white">Theme</p>
        <p className="mt-1 text-senior-sm text-brand-white/70">Dark (senior-accessible, high contrast)</p>
        <p className="mt-1 text-senior-xs text-brand-white/50">
          Kept as the only option — it&rsquo;s a deliberate accessibility choice for low-vision
          users, not just a default. Additional themes meeting the same contrast bar may come
          later.
        </p>
      </div>

      <div className="rounded-xl border border-brand-white/10 bg-brand-charcoal/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-senior-base font-bold text-brand-white">Data Backup</p>
            <p className="text-senior-sm text-brand-white/70">
              {online ? "Online — syncs automatically" : "Offline — will sync when back online"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing || !online}
            className="min-h-tap shrink-0 rounded-xl border border-brand-charcoal px-4 text-senior-sm font-bold text-brand-white transition active:scale-[0.98] disabled:text-brand-white/40"
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="min-h-tap rounded-xl border border-brand-white/10 bg-brand-charcoal/40 px-4 text-left text-senior-base font-bold text-brand-white"
        >
          Terms & Conditions
        </button>
        <button
          type="button"
          onClick={() => setShowPrivacy(true)}
          className="min-h-tap rounded-xl border border-brand-white/10 bg-brand-charcoal/40 px-4 text-left text-senior-base font-bold text-brand-white"
        >
          Privacy Policy
        </button>
      </div>

      {showProfile && (
        <BusinessProfileModal
          userId={userId}
          settings={settings}
          onClose={() => setShowProfile(false)}
          onSaved={reload}
        />
      )}
      {showTerms && (
        <LegalModal
          title="Terms & Conditions"
          paragraphs={TERMS_PARAGRAPHS}
          onClose={() => setShowTerms(false)}
        />
      )}
      {showPrivacy && (
        <LegalModal
          title="Privacy Policy"
          paragraphs={PRIVACY_PARAGRAPHS}
          onClose={() => setShowPrivacy(false)}
        />
      )}
    </div>
  );
}
