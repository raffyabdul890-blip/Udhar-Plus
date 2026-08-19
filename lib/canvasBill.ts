import { formatLedgerDate, type LedgerRow } from "@/lib/ledgerRows";

const WIDTH = 800;
const MARGIN = 24;
const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 170;
const FOOTER_HEIGHT = 120;

function fmt(n: number) {
  return n.toLocaleString("en-PK");
}

/**
 * Draws a ledger bill onto a canvas — a dependency-free stand-in for a PDF
 * renderer. White background / black text on purpose (a printed/shared bill
 * needs paper-like contrast regardless of the app's dark on-screen theme).
 */
export function renderBillCanvas(params: {
  shopLabel: string;
  customerName: string;
  customerPhone?: string;
  rows: LedgerRow[];
  netBalance: number;
}): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const height = HEADER_HEIGHT + Math.max(params.rows.length, 1) * ROW_HEIGHT + FOOTER_HEIGHT;
  canvas.width = WIDTH;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "alphabetic";

  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.fillText(params.shopLabel, MARGIN, 40);

  ctx.font = "16px system-ui, sans-serif";
  ctx.fillStyle = "#444444";
  ctx.fillText("Customer Ledger Statement", MARGIN, 66);
  ctx.fillStyle = "#000000";
  ctx.fillText(`Customer: ${params.customerName}`, MARGIN, 94);
  let nextLineY = 116;
  if (params.customerPhone) {
    ctx.fillText(`Phone: ${params.customerPhone}`, MARGIN, nextLineY);
    nextLineY += 22;
  }
  ctx.fillText(
    `Generated: ${new Date().toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}`,
    MARGIN,
    nextLineY
  );

  let y = HEADER_HEIGHT;
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.fillText("Date", MARGIN, y);
  ctx.fillText("Description", 150, y);
  ctx.fillText("Jama (IN)", 430, y);
  ctx.fillText("Udhar (OUT)", 550, y);
  ctx.fillText("Balance", 690, y);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN, y + 8);
  ctx.lineTo(WIDTH - MARGIN, y + 8);
  ctx.stroke();

  ctx.font = "14px system-ui, sans-serif";
  if (params.rows.length === 0) {
    y += ROW_HEIGHT;
    ctx.fillStyle = "#666666";
    ctx.fillText("No transactions recorded yet.", MARGIN, y);
    ctx.fillStyle = "#000000";
  } else {
    for (const row of params.rows) {
      y += ROW_HEIGHT;
      ctx.fillText(formatLedgerDate(row.date), MARGIN, y);
      ctx.fillText(row.description.slice(0, 26), 150, y);
      if (row.cashIn !== null) ctx.fillText(fmt(row.cashIn), 430, y);
      if (row.cashOut !== null) ctx.fillText(fmt(row.cashOut), 550, y);
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillText(fmt(row.runningBalance), 690, y);
      ctx.font = "14px system-ui, sans-serif";
    }
  }

  y += 40;
  ctx.strokeStyle = "#00000033";
  ctx.beginPath();
  ctx.moveTo(MARGIN, y);
  ctx.lineTo(WIDTH - MARGIN, y);
  ctx.stroke();

  y += 36;
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillText(`Net Udhar Remaining: Rs. ${fmt(params.netBalance)}`, MARGIN, y);

  y += 32;
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "#444444";
  ctx.fillText("Thank you for your business — Udhar Plus", MARGIN, y);

  return canvas;
}

export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
