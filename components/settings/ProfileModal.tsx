"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { selectClassName } from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";
import { saveBusinessSettings, type LocalBusinessSettings } from "@/lib/db/offlineStorage";
import { usePreferences } from "@/components/providers/PreferencesProvider";

const CATEGORIES: { value: string; labelKey: string }[] = [
  { value: "Kiryana", labelKey: "profile.categoryKiryana" },
  { value: "Pharmacy", labelKey: "profile.categoryPharmacy" },
  { value: "Mobile Shop", labelKey: "profile.categoryMobileShop" },
  { value: "General Store", labelKey: "profile.categoryGeneralStore" },
  { value: "Other", labelKey: "profile.categoryOther" },
];

export default function ProfileModal({
  userId,
  fullName,
  settings,
  onClose,
  onSaved,
}: {
  userId: string;
  fullName: string | null;
  settings: LocalBusinessSettings | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = usePreferences();
  const showToast = useToast();
  const router = useRouter();
  const [ownerName, setOwnerName] = useState(fullName ?? "");
  const [businessName, setBusinessName] = useState(settings?.business_name ?? "");
  const [category, setCategory] = useState(settings?.category ?? "");
  const [phone, setPhone] = useState(settings?.phone ?? "");
  const [address, setAddress] = useState(settings?.address ?? "");
  const [accountIdentity, setAccountIdentity] = useState<{ phone: string | null; email: string | null }>({
    phone: null,
    email: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        setAccountIdentity({ phone: data.user?.phone ?? null, email: data.user?.email ?? null });
      });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);

    const supabase = createClient();
    await Promise.all([
      supabase.auth.updateUser({ data: { full_name: ownerName.trim() || undefined } }),
      saveBusinessSettings(userId, {
        business_name: businessName.trim() || undefined,
        category: category || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      }),
    ]);

    setSaving(false);
    showToast(t("profile.saved"));
    onSaved();
    onClose();
    router.refresh();
  }

  return (
    <Modal title={t("profile.title")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-senior-xs font-bold uppercase tracking-wide text-ink-tertiary">
            {t("profile.ownerSection")}
          </h2>
          <TextField
            id="profile-owner-name"
            label={t("profile.ownerName")}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder={t("profile.ownerNamePlaceholder")}
            autoFocus
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-senior-xs font-bold uppercase tracking-wide text-ink-tertiary">
            {t("profile.businessSection")}
          </h2>
          <TextField
            id="profile-business-name"
            label={t("profile.businessName")}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Ahmed General Store"
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="profile-category" className="text-senior-base font-medium text-ink">
              {t("profile.businessCategory")}
            </label>
            <select
              id="profile-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectClassName}
            >
              <option value="">{t("profile.selectCategory")}</option>
              {CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-senior-xs font-bold uppercase tracking-wide text-ink-tertiary">
            {t("profile.contactSection")}
          </h2>
          <TextField
            id="profile-business-phone"
            label={t("profile.businessPhone")}
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="03001234567"
          />
          <TextField
            id="profile-address"
            label={t("profile.shopAddress")}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Main Bazaar, Lahore"
          />
          {(accountIdentity.phone || accountIdentity.email) && (
            <div className="rounded-xl border border-border bg-surface-alt px-4 py-3">
              <p className="text-senior-xs text-ink-secondary">
                {accountIdentity.phone ? t("profile.accountPhone") : t("profile.accountEmail")}
              </p>
              <p className="text-senior-sm font-bold text-ink" dir="ltr">
                {accountIdentity.phone ?? accountIdentity.email}
              </p>
            </div>
          )}
        </section>

        <Button type="submit" loading={saving} fullWidth>
          {t("common.saveChanges")}
        </Button>
      </form>
    </Modal>
  );
}
