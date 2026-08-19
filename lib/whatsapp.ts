/** Normalizes common Pakistani phone formats (03..., +92..., 92..., 3...) to bare "92XXXXXXXXXX" digits for wa.me. */
export function formatWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return `92${digits}`;
}

/** "92" + a 10-digit local number, e.g. 923001234567. */
export function isValidWhatsAppNumber(formatted: string): boolean {
  return /^92\d{10}$/.test(formatted);
}

export function buildReminderMessage(customerName: string, balance: number): string {
  const formattedBalance = balance.toLocaleString("en-PK");
  return `Assalam-o-Alaikum ${customerName}, aap ka Udhar Plus par total balance Rs. ${formattedBalance} baqi hai. Baraye mehrbani payment clear kar dein. Shukriya!`;
}

export function buildWhatsAppUrl(formattedNumber: string, message: string): string {
  return `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
}

/** Full ledger summary (last few entries + net balance) for the Export Summary modal. */
export function buildLedgerSummaryMessage(
  shopLabel: string,
  customerName: string,
  balance: number,
  recentLines: string[]
): string {
  const formattedBalance = balance.toLocaleString("en-PK");
  const history = recentLines.length > 0 ? `\n\nRecent entries:\n${recentLines.join("\n")}` : "";
  return `${shopLabel} — Ledger Summary for ${customerName}${history}\n\nNet Udhar Remaining: Rs. ${formattedBalance}\n\nThank you for your business!`;
}
