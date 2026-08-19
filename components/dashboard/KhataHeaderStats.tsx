import type { LocalCustomer } from "@/lib/db/offlineStorage";

export default function KhataHeaderStats({ customers }: { customers: LocalCustomer[] }) {
  const totalDiya = customers.reduce((sum, c) => sum + Math.max(c.current_balance, 0), 0);
  const totalLiya = customers.reduce((sum, c) => sum + Math.max(-c.current_balance, 0), 0);

  return (
    <div className="flex gap-2">
      <div className="flex-1 rounded-xl bg-brand-charcoal/40 p-3">
        <p className="text-senior-xs text-brand-white/60">Total Udhar Diya</p>
        <p className="text-senior-lg font-bold text-brand-red">{totalDiya.toLocaleString("en-PK")}</p>
      </div>
      <div className="flex-1 rounded-xl bg-brand-charcoal/40 p-3">
        <p className="text-senior-xs text-brand-white/60">Total Udhar Liya</p>
        <p className="text-senior-lg font-bold text-brand-green">
          {totalLiya.toLocaleString("en-PK")}
        </p>
      </div>
    </div>
  );
}
