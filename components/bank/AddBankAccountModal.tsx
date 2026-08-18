"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import BankLogoBadge from "@/components/bank/BankLogoBadge";
import { FINANCIAL_INSTITUTIONS, PAKISTANI_BANKS, PAKISTANI_WALLETS } from "@/lib/constants/banks";
import { addBankAccount } from "@/lib/db/offlineStorage";

export default function AddBankAccountModal({
  userId,
  onClose,
  onAdded,
}: {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [bankCode, setBankCode] = useState(PAKISTANI_BANKS[0].code);
  const [accountTitle, setAccountTitle] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected =
    FINANCIAL_INSTITUTIONS.find((institution) => institution.code === bankCode) ??
    PAKISTANI_BANKS[0];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!accountTitle.trim() || !accountNumber.trim()) {
      setError("Enter both the account title and account number.");
      return;
    }

    setSaving(true);
    await addBankAccount({
      user_id: userId,
      bank_name: selected.name,
      bank_code: selected.code,
      account_title: accountTitle.trim(),
      account_number: accountNumber.trim(),
      current_balance: 0,
    });
    setSaving(false);
    onAdded();
    onClose();
  }

  return (
    <Modal title="Add Bank / Wallet Account" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="bank-select" className="text-senior-base font-medium text-brand-white">
            Bank or wallet
          </label>
          <div className="flex items-center gap-3">
            <BankLogoBadge bankCode={bankCode} />
            <select
              id="bank-select"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="min-h-tap flex-1 rounded-xl border border-brand-charcoal bg-brand-black px-4 text-senior-base text-brand-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
            >
              <optgroup label="Commercial banks">
                {PAKISTANI_BANKS.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Wallets">
                {PAKISTANI_WALLETS.map((wallet) => (
                  <option key={wallet.code} value={wallet.code}>
                    {wallet.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <TextField
          id="account-title"
          label="Account title"
          value={accountTitle}
          onChange={(e) => setAccountTitle(e.target.value)}
          placeholder="e.g. Shop Account"
        />
        <TextField
          id="account-number"
          label="Account number"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="e.g. 03001234567"
          inputMode="numeric"
        />

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-brand-red bg-brand-charcoal px-4 py-3 text-senior-sm font-medium text-brand-white"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred disabled:bg-brand-charcoal disabled:text-brand-white/50"
        >
          {saving ? "Saving…" : "Save account"}
        </button>
      </form>
    </Modal>
  );
}
