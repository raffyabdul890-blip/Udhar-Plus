// Template legal copy — reflects what the app actually does today (see
// SECURITY.md), but is NOT a substitute for review by a qualified legal
// professional before a real business relies on it for compliance.

export const LEGAL_DISCLAIMER =
  "This is template content, not legal advice. Have a qualified professional review it before relying on it for your business.";

export const TERMS_PARAGRAPHS: string[] = [
  "Udhar Plus is a record-keeping tool for tracking customer credit (udhar), bank/wallet cash flow, inventory, and a daily cashbook. It is not a licensed lending, credit-reporting, or payment-processing service.",
  "You are responsible for the accuracy of the records you enter — names, amounts, and balances reflect what you record, not a verified transaction with any bank or payment network.",
  "Your data is stored on your device (for instant, offline access) and backed up to your Supabase project when you're online. You're responsible for keeping your account credentials secure.",
  "The app is provided as-is, without warranty of any kind. The developers are not liable for business decisions made based on records kept in the app.",
  "These terms may be updated as the app changes. Continued use after an update means you accept the revised terms.",
];

export const PRIVACY_PARAGRAPHS: string[] = [
  "Udhar Plus collects only what the ledger needs: customer names, phone numbers, transaction amounts/dates, and any notes or photos you choose to attach.",
  "Business data (customers, bank accounts, transactions, items, cashbook entries) is stored locally on your device via IndexedDB and synced to your Supabase project when online, protected by Row Level Security so only your account can read or write it.",
  "Photo attachments are stored locally on your device only and are not currently uploaded to the cloud.",
  "We do not sell your data or share it with third-party advertisers. No third-party analytics SDKs read your financial or contact data.",
  "Logging out clears your local device storage. A full \"export my data\" and \"delete my account\" flow is planned but not yet built — for now, contact support if you need your cloud records exported or removed.",
  "See SECURITY.md in the project repository for the full technical security posture, including current gaps that are still being addressed.",
];
