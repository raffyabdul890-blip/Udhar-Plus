"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { selectClassName } from "@/components/ui/TextField";
import BankLogoBadge from "@/components/bank/BankLogoBadge";
import { FINANCIAL_INSTITUTIONS, PAKISTANI_BANKS, PAKISTANI_WALLETS } from "@/lib/constants/banks";
import { recordBankTransaction } from "@/lib/db/ledger";
import { addBankAccount } from "@/lib/db/offlineStorage";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";

export default function AddBankAccountModal({
  userId,
  onClose,
  onAdded,
}: {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const showToast = useToast();
  const [bankCode, setBankCode] = useState(PAKISTANI_BANKS[0].code);
  const [accountTitle, setAccountTitle] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
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
    const account = await addBankAccount({
      user_id: userId,
      bank_name: selected.name,
      bank_code: selected.code,
      account_title: accountTitle.trim(),
      account_number: accountNumber.trim(),
      current_balance: 0,
    });

    const amount = Number(openingBalance) || 0;
    if (amount > 0) {
      // Reuses the existing transaction system — an opening balance is just a
      // first Add Money entry, same pattern as a customer's opening balance.
      // Uses the same minute-truncated "now" convention as every date-field-
      // backed entry (fromDatetimeLocalValue(toDatetimeLocalValue(...)), not a
      // raw full-precision timestamp — otherwise this entry can sort as
      // "later" than a same-minute entry recorded through a form, corrupting
      // history order (see AddCustomerModal's identical fix in Phase 3).
      const openingBalanceDate = fromDatetimeLocalValue(toDatetimeLocalValue(new Date()));
      await recordBankTransaction(account, "IN", amount, "Opening balance", openingBalanceDate);
    }

    setSaving(false);
    showToast("Account added");
    onAdded();
    onClose();
  }

  return (
    <Modal title="Add Bank / Wallet Account" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="rounded-xl border border-primary/20 bg-primary-light px-4 py-3 text-senior-xs text-primary">
          This is a manual ledger — Udhar Plus never connects to your real bank account. You record balances yourself.
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="bank-select" className="text-senior-base font-medium text-ink">
            Bank or wallet
          </label>
          <div className="flex items-center gap-3">
            <BankLogoBadge bankCode={bankCode} />
            <select
              id="bank-select"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className={`${selectClassName} flex-1`}
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
        <TextField
          id="account-opening-balance"
          label="Opening balance (optional)"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
          placeholder="0"
        />

        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-senior-sm font-medium text-danger-dark">
            {error}
          </p>
        )}

        <Button type="submit" loading={saving} fullWidth>
          Save Account
        </Button>
      </form>
    </Modal>
  );
}
