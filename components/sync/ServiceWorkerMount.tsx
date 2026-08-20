"use client";

import { useEffect } from "react";

/**
 * Registers the app-shell service worker (public/sw.js) so a full page reload
 * still loads while offline. Mounted once in the root layout — runs on every
 * route, including /login, since installing the PWA doesn't require a session.
 */
export default function ServiceWorkerMount() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — the app still works online without it, just without the
      // offline-reload fallback.
    });
  }, []);

  return null;
}
