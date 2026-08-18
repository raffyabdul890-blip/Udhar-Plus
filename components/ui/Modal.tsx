"use client";

import { useEffect, type ReactNode } from "react";

export default function Modal({
  title,
  onClose,
  dismissable = true,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Set false for required flows (e.g. onboarding) — hides the close button and disables Escape/backdrop dismissal. */
  dismissable?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!dismissable) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, dismissable]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={dismissable ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl border border-brand-white/10 bg-brand-charcoal p-6 sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="modal-title" className="text-senior-lg font-bold text-brand-white">
            {title}
          </h2>
          {dismissable && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex min-h-tap min-w-tap items-center justify-center rounded-xl text-senior-lg font-bold text-brand-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
            >
              ×
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
