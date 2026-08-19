import Amount from "@/components/ui/Amount";
import type { LocalCustomer } from "@/lib/db/offlineStorage";

export default function KhataHeaderStats({ customers }: { customers: LocalCustomer[] }) {
  const totalDiya = customers.reduce((sum, c) => sum + Math.max(c.current_balance, 0), 0);
  const totalLiya = customers.reduce((sum, c) => sum + Math.max(-c.current_balance, 0), 0);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
        <p className="text-senior-xs font-medium text-ink-secondary">Total Receivable</p>
        <Amount value={totalDiya} className="text-senior-lg font-bold text-danger" />
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
        <p className="text-senior-xs font-medium text-ink-secondary">Total Payable</p>
        <Amount value={totalLiya} className="text-senior-lg font-bold text-success-dark" />
      </div>
    </div>
  );
}
