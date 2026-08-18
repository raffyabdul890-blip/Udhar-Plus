export type FinancialInstitutionCategory = "bank" | "wallet";

export interface FinancialInstitution {
  code: string;
  name: string;
  /** 2-3 character badge text, shown on a colored circle in place of a logo image. */
  shortLabel: string;
  category: FinancialInstitutionCategory;
  /** Accent color for the badge — not an app brand token, kept out of tailwind.config.ts on purpose. */
  color: string;
}

export const PAKISTANI_BANKS: FinancialInstitution[] = [
  { code: "meezan", name: "Meezan Bank", shortLabel: "MZN", category: "bank", color: "#1A7B3C" },
  { code: "hbl", name: "HBL", shortLabel: "HBL", category: "bank", color: "#00693E" },
  { code: "ubl", name: "UBL", shortLabel: "UBL", category: "bank", color: "#5B2D90" },
  { code: "mcb", name: "MCB Bank", shortLabel: "MCB", category: "bank", color: "#C8102E" },
  { code: "allied", name: "Allied Bank", shortLabel: "ABL", category: "bank", color: "#004B87" },
  { code: "alfalah", name: "Bank Alfalah", shortLabel: "BAF", category: "bank", color: "#8B1D41" },
  { code: "bop", name: "Bank of Punjab", shortLabel: "BOP", category: "bank", color: "#00A651" },
  { code: "askari", name: "Askari Bank", shortLabel: "AKB", category: "bank", color: "#006747" },
  { code: "faysal", name: "Faysal Bank", shortLabel: "FYB", category: "bank", color: "#7CB342" },
  { code: "bankislami", name: "BankIslami", shortLabel: "BIP", category: "bank", color: "#00A99D" },
  { code: "nbp", name: "National Bank of Pakistan", shortLabel: "NBP", category: "bank", color: "#1B3E6F" },
  { code: "scb", name: "Standard Chartered", shortLabel: "SCB", category: "bank", color: "#0473EA" },
];

export const PAKISTANI_WALLETS: FinancialInstitution[] = [
  { code: "easypaisa", name: "Easypaisa", shortLabel: "EP", category: "wallet", color: "#00A651" },
  { code: "jazzcash", name: "JazzCash", shortLabel: "JC", category: "wallet", color: "#F58220" },
  { code: "sadapay", name: "SadaPay", shortLabel: "SP", category: "wallet", color: "#7B2FF7" },
  { code: "nayapay", name: "NayaPay", shortLabel: "NP", category: "wallet", color: "#00D2A0" },
  { code: "raast", name: "Raast", shortLabel: "RST", category: "wallet", color: "#DA0000" },
];

export const FINANCIAL_INSTITUTIONS: FinancialInstitution[] = [
  ...PAKISTANI_BANKS,
  ...PAKISTANI_WALLETS,
];

export function getFinancialInstitution(code: string): FinancialInstitution | undefined {
  return FINANCIAL_INSTITUTIONS.find((institution) => institution.code === code);
}
