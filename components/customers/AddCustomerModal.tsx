"use client";

import { useState, type SubmitEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { recordCustomerTransaction } from "@/lib/db/ledger";
import { addCustomer, updateCustomer, type LocalCustomer } from "@/lib/db/offlineStorage";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/utils/datetime";
import { usePreferences } from "@/components/providers/PreferencesProvider";

const contactsPickerAvailable =
  typeof navigator !== "undefined" && typeof navigator.contacts?.select === "function";

export type PostAddAction = "give" | "receive" | "whatsapp" | "done";
type OpeningBalanceDirection = "owes" | "owed";

export default function AddCustomerModal({
  userId,
  customer,
  onClose,
  onAdded,
}: {
  userId: string;
  /** Present only when editing an existing customer — swaps this into a name/phone/note editor and skips the add-only opening-balance and post-save shortcut screens. */
  customer?: LocalCustomer;
  onClose: () => void;
  /** Fires once the customer (and any opening balance) is saved — the caller decides the next screen. In edit mode, fires immediately with action "done". */
  onAdded: (customer: LocalCustomer, action: PostAddAction) => void;
}) {
  const { t } = usePreferences();
  const isEditing = Boolean(customer);
  const showToast = useToast();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [description, setDescription] = useState(customer?.description ?? "");
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

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("customer.errorEnterName"));
      return;
    }

    setSaving(true);

    if (isEditing && customer) {
      const changes = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        description: description.trim() || undefined,
      };
      await updateCustomer(customer.id, changes);
      setSaving(false);
      showToast(t("customer.updated"));
      onAdded({ ...customer, ...changes }, "done");
      return;
    }

    const newCustomer = await addCustomer({
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
      // date field (fromDatetimeLocalValue(toDatetimeLocalValue(...)), not a
      // raw full-precision timestamp — otherwise this entry's transaction_date
      // can sort as "earlier" than a same-minute entry recorded through the
      // form, even though it happened first. created_at (full ms precision)
      // still tie-breaks same-minute entries correctly via compareTransactionDates.
      const openingBalanceDate = fromDatetimeLocalValue(toDatetimeLocalValue(new Date()));
      await recordCustomerTransaction(newCustomer, type, amount, openingBalanceDate, {
        note: "Opening balance",
      });
      newCustomer.current_balance = type === "OUT" ? amount : -amount;
    }

    setSaving(false);
    showToast(t("customer.added"));
    setSavedCustomer(newCustomer);
  }

  if (savedCustomer) {
    return (
      <Modal title={t("customer.addedHeading")} onClose={() => onAdded(savedCustomer, "done")}>
        <div className="flex flex-col gap-4">
          <p className="text-senior-base text-ink">
            <span className="font-bold">{t("customer.hasBeenAdded", { name: savedCustomer.name })}</span>
            {savedCustomer.current_balance !== 0 &&
              t("customer.withOpeningBalance", {
                amount: Math.abs(savedCustomer.current_balance).toLocaleString("en-PK"),
              })}
          </p>

          <Button variant="warning" icon="khata" onClick={() => onAdded(savedCustomer, "give")}>
            {t("customer.giveUdhaar")}
          </Button>
          <Button variant="success" icon="cash-in" onClick={() => onAdded(savedCustomer, "receive")}>
            {t("customer.receivePayment")}
          </Button>

          {savedCustomer.phone ? (
            <Button variant="secondary" icon="whatsapp" onClick={() => onAdded(savedCustomer, "whatsapp")}>
              {t("transaction.sendWhatsApp")}
            </Button>
          ) : (
            <p className="text-senior-xs text-ink-secondary">{t("transaction.addPhoneForWhatsApp")}</p>
          )}

          <Button variant="ghost" onClick={() => onAdded(savedCustomer, "done")}>
            {t("common.done")}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={isEditing ? t("customer.edit") : t("customer.add")}
      onClose={onClose}
      footer={
        <Button type="submit" form="add-customer-form" loading={saving} fullWidth>
          {isEditing ? t("customer.saveChanges") : t("customer.saveCustomer")}
        </Button>
      }
    >
      <form id="add-customer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isEditing &&
          (contactsPickerAvailable ? (
            <Button variant="secondary" icon="contact" onClick={handlePickContact}>
              {t("customer.chooseFromContacts")}
            </Button>
          ) : (
            <p className="text-senior-xs text-ink-secondary">{t("customer.contactPickerUnsupported")}</p>
          ))}

        <TextField
          id="customer-name"
          label={t("customer.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("customer.namePlaceholder")}
          autoFocus
        />
        <TextField
          id="customer-phone"
          label={t("customer.phone")}
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03001234567"
        />
        <TextField
          id="customer-description"
          label={t("customer.note")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("customer.notePlaceholder")}
        />

        {!isEditing && (
          <>
            <SegmentedControl
              label={t("customer.openingBalance")}
              value={openingDirection}
              onChange={setOpeningDirection}
              options={[
                { value: "owes", label: t("customer.customerOwesMe") },
                { value: "owed", label: t("customer.iOweCustomer") },
              ]}
            />
            <TextField
              id="customer-opening-balance"
              label={t("customer.openingBalanceAmount")}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="0"
            />
          </>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-senior-sm font-medium text-danger-dark">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
