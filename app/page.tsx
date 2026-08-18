import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const metadata = user.user_metadata as { full_name?: string; shop_name?: string } | null;

  return (
    <DashboardShell
      userId={user.id}
      phone={user.phone ?? null}
      email={user.email ?? null}
      fullName={metadata?.full_name ?? null}
      shopName={metadata?.shop_name ?? null}
    />
  );
}
