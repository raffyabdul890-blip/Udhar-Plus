"use client";

import { useEffect, useState } from "react";
import OnboardingModal from "@/components/auth/OnboardingModal";
import TopNavbar from "@/components/dashboard/TopNavbar";
import BottomNav, { type BottomTabId } from "@/components/dashboard/BottomNav";
import DesktopSidebar from "@/components/dashboard/DesktopSidebar";
import KhataTab from "@/components/dashboard/KhataTab";
import CashbookTab from "@/components/cashbook/CashbookTab";
import ItemsTab from "@/components/items/ItemsTab";
import ReportsTab from "@/components/reports/ReportsTab";
import MoreTab from "@/components/settings/MoreTab";
import { isOnboardingCompleteLocally } from "@/lib/onboarding";

export default function DashboardShell({
  userId,
  fullName,
  shopName,
  onboardingCompleted: initialOnboardingCompleted,
}: {
  userId: string;
  fullName: string | null;
  shopName: string | null;
  onboardingCompleted: boolean;
}) {
  const [onboardingCompleted, setOnboardingCompleted] = useState(initialOnboardingCompleted);
  const [activeTab, setActiveTab] = useState<BottomTabId>("khata");

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

  const needsOnboarding = !onboardingCompleted;
  const primaryLabel = shopName ?? fullName ?? "Udhar Plus";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col lg:max-w-5xl lg:flex-row">
      <DesktopSidebar active={activeTab} onChange={setActiveTab} primaryLabel={primaryLabel} />

      <div className="flex min-h-screen flex-1 flex-col lg:min-h-0">
        <div
          className="sticky top-0 z-10 bg-brand-black px-4 pb-3 lg:static"
          style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
        >
          <TopNavbar primaryLabel={primaryLabel} />
        </div>

        <div className="flex-1 px-4 pb-[calc(6rem_+_env(safe-area-inset-bottom))] lg:pb-8">
          {activeTab === "khata" && <KhataTab userId={userId} shopLabel={primaryLabel} />}
          {activeTab === "cashbook" && <CashbookTab userId={userId} />}
          {activeTab === "items" && <ItemsTab userId={userId} />}
          {activeTab === "reports" && <ReportsTab userId={userId} shopLabel={primaryLabel} />}
          {activeTab === "more" && <MoreTab userId={userId} />}
        </div>
      </div>

      <BottomNav active={activeTab} onChange={setActiveTab} />

      {needsOnboarding && (
        <OnboardingModal userId={userId} onComplete={() => setOnboardingCompleted(true)} />
      )}
    </div>
  );
}
