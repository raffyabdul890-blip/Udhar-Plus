import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { isBottomTabId } from "@/components/dashboard/BottomNav";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  // The active tab is mirrored into this query param (see DashboardShell's
  // handleTabChange) purely so a full reload/PWA relaunch can restore it —
  // reading it here lets the correct tab render in the first server response
  // instead of flashing Dashboard and then switching.
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const metadata = user.user_metadata as {
    full_name?: string;
    shop_name?: string;
    onboarding_completed?: boolean;
  } | null;

  const { tab } = await searchParams;
  const tabParam = Array.isArray(tab) ? tab[0] : tab;
  const initialTab = isBottomTabId(tabParam) ? tabParam : "dashboard";

  return (
    <DashboardShell
      userId={user.id}
      fullName={metadata?.full_name ?? null}
      shopName={metadata?.shop_name ?? null}
      onboardingCompleted={metadata?.onboarding_completed === true}
      initialTab={initialTab}
    />
  );
}
