export type FinancialInstitutionCategory = "bank" | "wallet";

export interface FinancialInstitution {
  code: string;
  name: string;
  /** 2-4 character badge text shown on the identity tile in place of a licensed logo image — see components/bank/BankLogoBadge.tsx. */
  shortLabel: string;
  category: FinancialInstitutionCategory;
  /** Brand-identity accent color for the tile — not an app brand token, kept out of tailwind.config.ts on purpose. */
  color: string;
}

export const PAKISTANI_BANKS: FinancialInstitution[] = [
  { code: "hbl", name: "HBL", shortLabel: "HBL", category: "bank", color: "#00693E" },
  { code: "ubl", name: "UBL", shortLabel: "UBL", category: "bank", color: "#5B2D90" },
  { code: "mcb", name: "MCB Bank", shortLabel: "MCB", category: "bank", color: "#C8102E" },
  { code: "allied", name: "Allied Bank", shortLabel: "ABL", category: "bank", color: "#004B87" },
  { code: "meezan", name: "Meezan Bank", shortLabel: "MZN", category: "bank", color: "#1A7B3C" },
  { code: "alfalah", name: "Bank Alfalah", shortLabel: "BAF", category: "bank", color: "#8B1D41" },
  { code: "alhabib", name: "Bank Al Habib", shortLabel: "BAH", category: "bank", color: "#8A6D3B" },
  { code: "askari", name: "Askari Bank", shortLabel: "AKB", category: "bank", color: "#006747" },
  { code: "faysal", name: "Faysal Bank", shortLabel: "FYB", category: "bank", color: "#7CB342" },
  { code: "scb", name: "Standard Chartered", shortLabel: "SCB", category: "bank", color: "#0473EA" },
  { code: "nbp", name: "National Bank of Pakistan", shortLabel: "NBP", category: "bank", color: "#1B3E6F" },
  { code: "soneri", name: "Soneri Bank", shortLabel: "SNR", category: "bank", color: "#A67C00" },
  { code: "jsbank", name: "JS Bank", shortLabel: "JS", category: "bank", color: "#E4032E" },
  { code: "hmb", name: "Habib Metropolitan Bank", shortLabel: "HMB", category: "bank", color: "#0F5FA6" },
  { code: "silkbank", name: "Silkbank", shortLabel: "SLK", category: "bank", color: "#D4145A" },
  { code: "bop", name: "The Bank of Punjab", shortLabel: "BOP", category: "bank", color: "#00A651" },
  { code: "bok", name: "The Bank of Khyber", shortLabel: "BOK", category: "bank", color: "#144B8C" },
  { code: "dib", name: "Dubai Islamic Bank Pakistan", shortLabel: "DIB", category: "bank", color: "#00563F" },
  { code: "fwb", name: "First Women Bank", shortLabel: "FWB", category: "bank", color: "#B0175E" },
  { code: "bankislami", name: "BankIslami", shortLabel: "BIP", category: "bank", color: "#00A99D" },
  { code: "samba", name: "Samba Bank", shortLabel: "SMB", category: "bank", color: "#5A2A82" },
  { code: "other-bank", name: "Other Bank", shortLabel: "?", category: "bank", color: "#0369A1" },
];

export const PAKISTANI_WALLETS: FinancialInstitution[] = [
  { code: "jazzcash", name: "JazzCash", shortLabel: "JC", category: "wallet", color: "#F58220" },
  { code: "easypaisa", name: "Easypaisa", shortLabel: "EP", category: "wallet", color: "#00A651" },
  { code: "sadapay", name: "SadaPay", shortLabel: "SP", category: "wallet", color: "#7B2FF7" },
  { code: "nayapay", name: "NayaPay", shortLabel: "NP", category: "wallet", color: "#00D2A0" },
  { code: "raast", name: "Raast", shortLabel: "RST", category: "wallet", color: "#DA0000" },
  { code: "other-wallet", name: "Other Wallet", shortLabel: "?", category: "wallet", color: "#0369A1" },
];

export const FINANCIAL_INSTITUTIONS: FinancialInstitution[] = [
  ...PAKISTANI_BANKS,
  ...PAKISTANI_WALLETS,
];

export function getFinancialInstitution(code: string): FinancialInstitution | undefined {
  return FINANCIAL_INSTITUTIONS.find((institution) => institution.code === code);
}
