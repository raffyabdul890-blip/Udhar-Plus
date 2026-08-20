"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/icons/Icon";
import Button from "@/components/ui/Button";
import { usePreferences } from "@/components/providers/PreferencesProvider";

/**
 * Registers the app-shell service worker (public/sw.js) so a full page reload
 * still loads while offline. Mounted once in the root layout — runs on every
 * route, including /login, since installing the PWA doesn't require a session.
 *
 * Update handling: sw.js calls skipWaiting()/clients.claim() unconditionally,
 * so a new deployment always takes over in the background — nothing here
 * forces a reload or can interrupt someone mid-transaction. `controllerchange`
 * fires the moment that handover happens; if it fires after this tab already
 * had a controller (i.e. not the very first load), that's a live update, and
 * this banner just lets the user opt into picking up the new UI on their own
 * schedule instead of silently sitting on stale JS until their next natural
 * navigation.
 */
export default function ServiceWorkerMount() {
  const { t } = usePreferences();
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let hadControllerBefore = Boolean(navigator.serviceWorker.controller);

    function handleControllerChange() {
      if (hadControllerBefore) {
        setUpdateAvailable(true);
      }
      hadControllerBefore = true;
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — the app still works online without it, just without the
      // offline-reload fallback.
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-elevated lg:inset-x-auto lg:bottom-6 lg:end-6 lg:mx-0 lg:max-w-sm"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
        <Icon name="check-circle" size={18} />
      </span>
      <p className="flex-1 text-senior-sm font-medium text-ink">{t("sync.updateAvailable")}</p>
      <Button size="sm" onClick={() => window.location.reload()}>
        {t("sync.update")}
      </Button>
    </div>
  );
}
