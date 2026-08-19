"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { recordCustomerTransaction } from "@/lib/db/ledger";
import { addCustomer, type LocalCustomer } from "@/lib/db/offlineStorage";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";

const contactsPickerAvailable =
  typeof navigator !== "undefined" && typeof navigator.contacts?.select === "function";

export type PostAddAction = "give" | "receive" | "whatsapp" | "done";
type OpeningBalanceDirection = "owes" | "owed";

export default function AddCustomerModal({
  userId,
  onClose,
  onAdded,
}: {
  userId: string;
  onClose: () => void;
  /** Fires once the customer (and any opening balance) is saved — the caller decides the next screen. */
  onAdded: (customer: LocalCustomer, action: PostAddAction) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [openingDirection, setOpeningDirection] = useState<OpeningBalanceDirection>("owes");
  const [openingAmount, setOpeningAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCustomer, setSavedCustomer] = useState<LocalCustomer | null>(null);

  async function handlePickContact() {
    if (!navigator.contacts?.select) return;
    try {
      const [contact] = await navigator.contacts.select(["name", "tel"], { multiple: false });
      if (contact?.name?.[0]) setName(contact.name[0]);
      if (contact?.tel?.[0]) setPhone(contact.tel[0]);
    } catch {
      // User cancelled the picker or denied permission — manual entry still works.
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Enter the customer's name.");
      return;
    }

    setSaving(true);
    const customer = await addCustomer({
      user_id: userId,
      name: name.trim(),
      phone: phone.trim() || undefined,
      description: description.trim() || undefined,
      current_balance: 0,
    });

    const amount = Number(openingAmount) || 0;
    if (amount > 0) {
      // Reuses the existing transaction system rather than a separate balance
      // field — an opening balance is just a first Diye/Milay entry.
      const type = openingDirection === "owes" ? ("OUT" as const) : ("IN" as const);
      // Same minute-truncated "now" convention as the transaction form's
      // date field (fromDatetimeLocalValue(toDatetimeLocalValue(...))), not a
      // raw full-precision timestamp — otherwise this entry's transaction_date
      // can sort as "earlier" than a same-minute entry recorded through the
      // form, even though it happened first. created_at (full ms precision)
      // still tie-breaks same-minute entries correctly via compareTransactionDates.
      const openingBalanceDate = fromDatetimeLocalValue(toDatetimeLocalValue(new Date()));
      await recordCustomerTransaction(customer, type, amount, openingBalanceDate, {
        note: "Opening balance",
      });
      customer.current_balance = type === "OUT" ? amount : -amount;
    }

    setSaving(false);
    setSavedCustomer(customer);
  }

  if (savedCustomer) {
    return (
      <Modal title="Customer Added" onClose={() => onAdded(savedCustomer, "done")}>
        <div className="flex flex-col gap-4">
          <p className="text-senior-base text-brand-white">
            <span className="font-bold">{savedCustomer.name}</span> has been added
            {savedCustomer.current_balance !== 0 && (
              <>
                {" "}
                with an opening balance of{" "}
                <span className="font-bold">
                  {Math.abs(savedCustomer.current_balance).toLocaleString("en-PK")}
                </span>
                .
              </>
            )}
          </p>

          <button
            type="button"
            onClick={() => onAdded(savedCustomer, "give")}
            className="min-h-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred"
          >
            Give Udhaar
          </button>
          <button
            type="button"
            onClick={() => onAdded(savedCustomer, "receive")}
            className="min-h-tap rounded-xl border border-brand-charcoal px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98]"
          >
            Receive Payment
          </button>

          {savedCustomer.phone ? (
            <button
              type="button"
              onClick={() => onAdded(savedCustomer, "whatsapp")}
              className="min-h-tap rounded-xl border border-brand-charcoal px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98]"
            >
              💬 Send WhatsApp
            </button>
          ) : (
            <p className="text-senior-xs text-brand-white/50">
              Add a phone number to send WhatsApp messages to this customer.
            </p>
          )}

          <button
            type="button"
            onClick={() => onAdded(savedCustomer, "done")}
            className="min-h-tap text-senior-sm font-medium text-brand-white/80 underline"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Add Customer" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {contactsPickerAvailable ? (
          <button
            type="button"
            onClick={handlePickContact}
            className="flex min-h-tap items-center justify-center gap-2 rounded-xl border border-brand-charcoal px-4 text-senior-sm font-bold text-brand-white transition active:scale-[0.98]"
          >
            📇 Choose from Contacts
          </button>
        ) : (
          <p className="text-senior-xs text-brand-white/50">
            Contact picker isn&rsquo;t supported on this device. Enter the number manually.
          </p>
        )}

        <TextField
          id="customer-name"
          label="Customer name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ahmed General Store"
          autoFocus
        />
        <TextField
          id="customer-phone"
          label="Phone / WhatsApp (optional)"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03001234567"
        />
        <TextField
          id="customer-description"
          label="Note (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Regular customer, shop on Main Road"
        />

        <SegmentedControl
          label="Opening balance (optional)"
          value={openingDirection}
          onChange={setOpeningDirection}
          options={[
            { value: "owes", label: "Customer owes me" },
            { value: "owed", label: "I owe customer" },
          ]}
        />
        <TextField
          id="customer-opening-balance"
          label="Opening balance amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={openingAmount}
          onChange={(e) => setOpeningAmount(e.target.value)}
          placeholder="0"
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
          {saving ? "Saving…" : "Save customer"}
        </button>
      </form>
    </Modal>
  );
}
