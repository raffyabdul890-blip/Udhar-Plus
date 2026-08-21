"use client";

import Amount from "@/components/ui/Amount";
import type { LocalCustomer } from "@/lib/db/offlineStorage";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export default function KhataHeaderStats({ customers }: { customers: LocalCustomer[] }) {
  const { t } = usePreferences();
  const totalDiya = customers.reduce((sum, c) => sum + Math.max(c.current_balance, 0), 0);
  const totalLiya = customers.reduce((sum, c) => sum + Math.max(-c.current_balance, 0), 0);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-danger/10 bg-danger-light p-4 shadow-card">
        <p className="text-senior-xs font-medium text-ink-secondary">{t("khata.totalReceivable")}</p>
        <Amount value={totalDiya} className="text-senior-lg font-bold text-danger" />
      </div>
      <div className="rounded-2xl border border-success/10 bg-success-light p-4 shadow-card">
        <p className="text-senior-xs font-medium text-ink-secondary">{t("khata.totalPayable")}</p>
        <Amount value={totalLiya} className="text-senior-lg font-bold text-success-dark" />
      </div>
    </div>
  );
}
