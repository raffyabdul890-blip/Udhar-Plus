"use client";

import { useEffect, useState } from "react";
import OnboardingModal from "@/components/auth/OnboardingModal";
import TopNavbar from "@/components/dashboard/TopNavbar";
import OfflineBanner from "@/components/dashboard/OfflineBanner";
import BottomNav, { NAV_ITEMS, type BottomTabId } from "@/components/dashboard/BottomNav";
import DesktopSidebar from "@/components/dashboard/DesktopSidebar";
import DashboardHome from "@/components/dashboard/DashboardHome";
import KhataTab from "@/components/dashboard/KhataTab";
import CashbookTab from "@/components/cashbook/CashbookTab";
import SalesTab from "@/components/sales/SalesTab";
import ItemsTab from "@/components/items/ItemsTab";
import ReportsTab from "@/components/reports/ReportsTab";
import BankWalletTab from "@/components/bank/BankWalletTab";
import MoreTab from "@/components/settings/MoreTab";
import { isOnboardingCompleteLocally } from "@/lib/onboarding";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export type QuickActionId = "give" | "receive" | "customer" | "expense" | "sale";

export default function DashboardShell({
  userId,
  fullName,
  shopName,
  onboardingCompleted: initialOnboardingCompleted,
  initialTab,
}: {
  userId: string;
  fullName: string | null;
  shopName: string | null;
  onboardingCompleted: boolean;
  /** From the `?tab=` URL param (resolved server-side in app/page.tsx) — lets a refresh/PWA relaunch restore the screen the user was on instead of always opening Dashboard. */
  initialTab: BottomTabId;
}) {
  const [onboardingCompleted, setOnboardingCompleted] = useState(initialOnboardingCompleted);
  const [activeTab, setActiveTab] = useState<BottomTabId>(initialTab);
  const [pendingAction, setPendingAction] = useState<QuickActionId | null>(null);

  // Mirrors the active tab into the URL (?tab=khata) via the raw History API —
  // deliberately not next/navigation's router, which would re-run the server
  // component (it reads searchParams) on every tab tap, adding a network
  // round-trip to what is otherwise an instant client-side swap and breaking
  // offline tab switching. Passing the existing history.state through keeps
  // Next's own router bookkeeping for this entry intact. replaceState (not
  // pushState) matches the app's existing single-history-entry navigation —
  // this only fixes what a refresh restores, not the back/forward stack.
  function handleTabChange(tab: BottomTabId) {
    setActiveTab(tab);
    const search = tab === "dashboard" ? "" : `?tab=${tab}`;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}`);
  }

  useEffect(() => {
    // Checked post-mount (not in a lazy useState initializer) to avoid a hydration
    // mismatch — the server-rendered value always matches the first client render,
    // then this corrects it a moment later if localStorage says otherwise (e.g. the
    // terms-accepted flag saved locally before a Supabase metadata write could land).
    if (!onboardingCompleted && isOnboardingCompleteLocally(userId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOnboardingCompleted(true);
    }
  }, [onboardingCompleted, userId]);

  useEffect(() => {
    // Tab content swaps in place rather than navigating, so the browser keeps
    // whatever scroll position the previous tab was at — without this, a tab
    // switched to while scrolled down can render its top content behind the
    // sticky header instead of opening at the top like a fresh screen would.
    window.scrollTo(0, 0);
  }, [activeTab]);

  const { t } = usePreferences();
  const needsOnboarding = !onboardingCompleted;
  const primaryLabel = shopName ?? fullName ?? "Udhar Plus";
  const sectionTitle = NAV_ITEMS.some((item) => item.id === activeTab) ? t(`nav.${activeTab}`) : "Udhar Plus";

  function handleQuickAction(action: QuickActionId) {
    handleTabChange(action === "expense" ? "cashbook" : "khata");
    setPendingAction(action);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col lg:max-w-6xl lg:flex-row">
      <DesktopSidebar active={activeTab} onChange={handleTabChange} primaryLabel={primaryLabel} />

      <div className="flex min-h-screen flex-1 flex-col lg:min-h-0">
        <div
          className="sticky top-0 z-10 bg-canvas/95 px-4 pb-3 backdrop-blur lg:static lg:bg-transparent lg:pt-6"
          style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
        >
          <TopNavbar sectionTitle={sectionTitle} />
          <OfflineBanner />
        </div>

        <div className="flex-1 px-4 pb-[calc(6rem_+_env(safe-area-inset-bottom))] lg:pb-8">
          {activeTab === "dashboard" && (
            <DashboardHome
              userId={userId}
              shopLabel={primaryLabel}
              onQuickAction={handleQuickAction}
              onNavigateToTab={handleTabChange}
            />
          )}
          {activeTab === "khata" && (
            <KhataTab
              userId={userId}
              shopLabel={primaryLabel}
              pendingAction={
                pendingAction === "give" ||
                pendingAction === "receive" ||
                pendingAction === "customer" ||
                pendingAction === "sale"
                  ? pendingAction
                  : null
              }
              onPendingActionHandled={() => setPendingAction(null)}
            />
          )}
          {activeTab === "cashbook" && (
            <CashbookTab
              userId={userId}
              pendingExpense={pendingAction === "expense"}
              onPendingActionHandled={() => setPendingAction(null)}
            />
          )}
          {activeTab === "sales" && <SalesTab userId={userId} shopLabel={primaryLabel} />}
          {activeTab === "items" && <ItemsTab userId={userId} />}
          {activeTab === "reports" && <ReportsTab userId={userId} shopLabel={primaryLabel} />}
          {activeTab === "bank" && <BankWalletTab userId={userId} />}
          {activeTab === "more" && (
            <MoreTab userId={userId} fullName={fullName} onNavigateToTab={handleTabChange} />
          )}
        </div>
      </div>

      <BottomNav active={activeTab} onChange={handleTabChange} />

      {needsOnboarding && (
        <OnboardingModal userId={userId} onComplete={() => setOnboardingCompleted(true)} />
      )}
    </div>
  );
}
