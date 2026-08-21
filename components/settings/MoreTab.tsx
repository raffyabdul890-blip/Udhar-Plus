"use client";

import { useCallback, useEffect, useState } from "react";
import Icon, { type IconName } from "@/components/icons/Icon";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/ToastProvider";
import { CustomerCardSkeletonList } from "@/components/skeletons/CustomerCardSkeleton";
import ProfileModal from "@/components/settings/ProfileModal";
import ThemeSelector from "@/components/settings/ThemeSelector";
import LanguageSelector from "@/components/settings/LanguageSelector";
import LegalModal from "@/components/settings/LegalModal";
import LogoutButton from "@/components/auth/LogoutButton";
import {
  getBusinessSettings,
  getPendingSyncCount,
  saveBusinessSettings,
  type LocalBusinessSettings,
} from "@/lib/db/offlineStorage";
import { syncPendingRecords } from "@/lib/sync/syncEngine";
import { getLastSyncedAt } from "@/lib/sync/syncStatus";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import type { LanguagePreference, ThemePreference } from "@/lib/preferences/localMirror";
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
      className="flex min-h-tap w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-start transition active:scale-[0.99] active:bg-surface-alt"
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

/** Called from event handlers only (never during render) — Date.now() there is fine, just not in the render path. */
function formatLastSynced(t: (key: string) => string, iso: string | null): string {
  if (!iso) return t("settings.notSyncedYet");
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return t("sync.synced");
  if (minutes < 60) return `${t("sync.synced")} · ${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${t("sync.synced")} · ${hours}h`;
  const days = Math.round(hours / 24);
  return `${t("sync.synced")} · ${days}d`;
}

export default function MoreTab({
  userId,
  fullName,
  onNavigateToTab,
}: {
  userId: string;
  fullName: string | null;
  /** Mobile's bottom nav only fits 5 destinations — Sales/Reports/Bank & Wallet live here instead. */
  onNavigateToTab: (tab: "sales" | "reports" | "bank") => void;
}) {
  const { t, setTheme, setLanguage } = usePreferences();
  const showToast = useToast();
  const [settings, setSettings] = useState<LocalBusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const online = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedLabel, setLastSyncedLabel] = useState("");

  const reload = useCallback(async () => {
    setSettings((await getBusinessSettings(userId)) ?? null);
    setPendingCount(await getPendingSyncCount(userId));
    setLastSyncedLabel(formatLastSynced(t, getLastSyncedAt(userId)));
    setLoading(false);
  }, [userId, t]);

  useEffect(() => {
    // Synchronizing with IndexedDB (an external store), not deriving state from props —
    // the textbook valid effect use case, just one the new lint rule can't tell apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  async function handleThemeChange(next: ThemePreference) {
    setTheme(next);
    const updated = await saveBusinessSettings(userId, { theme: next });
    setSettings(updated);
  }

  async function handleLanguageChange(next: LanguagePreference) {
    setLanguage(next);
    const updated = await saveBusinessSettings(userId, { language: next });
    setSettings(updated);
  }

  async function handleSyncNow() {
    setSyncing(true);
    await syncPendingRecords(userId);
    setSyncing(false);
    setPendingCount(await getPendingSyncCount(userId));
    setLastSyncedLabel(formatLastSynced(t, getLastSyncedAt(userId)));
    showToast(t("sync.synced"));
  }

  if (loading) {
    return <CustomerCardSkeletonList count={3} label={t("settings.title")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 lg:hidden">
        <SectionHeader>{t("settings.moreTools")}</SectionHeader>
        <Row icon="sales" title={t("nav.sales")} detail={t("settings.salesTool")} onClick={() => onNavigateToTab("sales")} />
        <Row icon="reports" title={t("nav.reports")} detail={t("settings.reportsTool")} onClick={() => onNavigateToTab("reports")} />
        <Row icon="bank" title={t("nav.bank")} detail={t("settings.bankTool")} onClick={() => onNavigateToTab("bank")} />
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeader>{t("settings.account")}</SectionHeader>
        <Row
          icon="user"
          title={t("settings.profile")}
          detail={fullName || t("settings.profileDescription")}
          onClick={() => setShowProfile(true)}
        />
        <LogoutButton />
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeader>{t("settings.business")}</SectionHeader>
        <Row
          icon="khata"
          title={t("settings.businessProfile")}
          detail={settings?.business_name || t("settings.businessProfileDescription")}
          onClick={() => setShowProfile(true)}
        />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader>{t("settings.appearance")}</SectionHeader>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-senior-base font-bold text-ink">{t("settings.language")}</p>
          <LanguageSelector onChange={handleLanguageChange} />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-senior-base font-bold text-ink">{t("settings.theme")}</p>
          <ThemeSelector onChange={handleThemeChange} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeader>{t("settings.data")}</SectionHeader>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-senior-base font-bold text-ink">{t("settings.dataBackup")}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={online ? "success" : "neutral"}>{online ? t("common.online") : t("common.offline")}</Badge>
                <p className="text-senior-sm text-ink-secondary">
                  {online ? t("settings.syncsAutomatically") : t("settings.willSyncWhenOnline")}
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleSyncNow} disabled={syncing || !online}>
              {syncing ? t("settings.syncing") : t("settings.syncNow")}
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <p className="text-senior-xs text-ink-secondary">{syncing ? t("settings.syncing") : lastSyncedLabel}</p>
            {pendingCount > 0 && (
              <Badge variant="warning">
                {t(pendingCount === 1 ? "settings.changesPending" : "settings.changesPendingPlural", {
                  count: pendingCount,
                })}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeader>{t("settings.legal")}</SectionHeader>
        <Row icon="file-text" title={t("settings.termsAndConditions")} onClick={() => setShowTerms(true)} />
        <Row icon="shield" title={t("settings.privacyPolicy")} onClick={() => setShowPrivacy(true)} />
      </div>

      {showProfile && (
        <ProfileModal
          userId={userId}
          fullName={fullName}
          settings={settings}
          onClose={() => setShowProfile(false)}
          onSaved={reload}
        />
      )}
      {showTerms && (
        <LegalModal title={t("settings.termsAndConditions")} paragraphs={TERMS_PARAGRAPHS} onClose={() => setShowTerms(false)} />
      )}
      {showPrivacy && (
        <LegalModal title={t("settings.privacyPolicy")} paragraphs={PRIVACY_PARAGRAPHS} onClose={() => setShowPrivacy(false)} />
      )}
    </div>
  );
}
