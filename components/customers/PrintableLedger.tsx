import { compareTransactionDates } from "@/lib/utils/datetime";
import type { LocalCustomer, LocalTransaction } from "@/lib/db/offlineStorage";

interface LedgerRow {
  date: string;
  description: string;
  cashIn: number | null;
  cashOut: number | null;
  runningBalance: number;
}

function buildLedgerRows(transactions: LocalTransaction[]): LedgerRow[] {
  const chronological = [...transactions].sort(compareTransactionDates);

  let balance = 0;
  return chronological.map((txn) => {
    balance += txn.type === "OUT" ? txn.amount : -txn.amount;
    return {
      date: txn.transaction_date,
      description: txn.note || (txn.type === "IN" ? "Payment received" : "Credit given"),
      cashIn: txn.type === "IN" ? txn.amount : null,
      cashOut: txn.type === "OUT" ? txn.amount : null,
      runningBalance: balance,
    };
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Print-only ledger document. Hidden on screen (`hidden print:block`); the
 * `.print-ledger` class pairs with the global rule in globals.css that hides
 * everything else on the page for `window.print()`. Uses plain black-on-white
 * classes rather than brand dark-theme tokens on purpose — a printed page has
 * different constraints (paper, ink, readability) than the on-screen app.
 */
export default function PrintableLedger({
  customer,
  transactions,
  shopLabel,
}: {
  customer: LocalCustomer;
  transactions: LocalTransaction[];
  shopLabel: string;
}) {
  const rows = buildLedgerRows(transactions);
  const generatedAt = new Date().toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="print-ledger hidden bg-white p-8 text-black print:block">
      <header className="mb-6 border-b border-black/20 pb-4">
        <h1 className="text-2xl font-bold">{shopLabel}</h1>
        <p className="mt-1 text-sm text-black/70">Customer Ledger Statement</p>
        <dl className="mt-4 flex flex-col gap-1 text-sm">
          <div className="flex gap-2">
            <dt className="font-semibold">Customer:</dt>
            <dd>{customer.name}</dd>
          </div>
          {customer.phone && (
            <div className="flex gap-2">
              <dt className="font-semibold">Phone:</dt>
              <dd>{customer.phone}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="font-semibold">Generated:</dt>
            <dd>{generatedAt}</dd>
          </div>
        </dl>
      </header>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2 pr-2">Date</th>
            <th className="py-2 pr-2">Description</th>
            <th className="py-2 pr-2 text-right">Cash IN (Jama)</th>
            <th className="py-2 pr-2 text-right">Cash OUT (Udhar)</th>
            <th className="py-2 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 text-center text-black/60">
                No transactions recorded yet.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-b border-black/10">
                <td className="py-2 pr-2">{formatDate(row.date)}</td>
                <td className="py-2 pr-2">{row.description}</td>
                <td className="py-2 pr-2 text-right">
                  {row.cashIn !== null ? row.cashIn.toLocaleString("en-PK") : ""}
                </td>
                <td className="py-2 pr-2 text-right">
                  {row.cashOut !== null ? row.cashOut.toLocaleString("en-PK") : ""}
                </td>
                <td className="py-2 text-right font-medium">
                  {row.runningBalance.toLocaleString("en-PK")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <footer className="mt-8 border-t border-black/20 pt-4">
        <p className="text-lg font-bold">
          Net Udhar Remaining: Rs. {customer.current_balance.toLocaleString("en-PK")}
        </p>
        <p className="mt-6 text-sm text-black/70">Thank you for your business.</p>
        <div className="mt-10 flex justify-end">
          <div className="w-56 border-t border-black pt-1 text-center text-sm">Signature</div>
        </div>
      </footer>
    </div>
  );
}
