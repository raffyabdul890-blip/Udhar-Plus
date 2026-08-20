"use client";

import { useEffect, type ReactNode } from "react";
import Icon from "@/components/icons/Icon";

export default function Modal({
  title,
  onClose,
  dismissable = true,
  hideTitle = false,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Set false for required flows (e.g. onboarding) — hides the close button and disables Escape/backdrop dismissal. */
  dismissable?: boolean;
  /** Hides the default header — use when the modal body renders its own dedicated header (e.g. a colored Give Udhaar banner). The title is still set via aria-label for a11y. */
  hideTitle?: boolean;
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
      onClick={dismissable ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={hideTitle ? title : undefined}
        aria-labelledby={hideTitle ? undefined : "modal-title"}
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[92vh] w-full animate-slide-up-sheet flex-col gap-4 overflow-y-auto rounded-t-2xl border border-border bg-surface p-6 shadow-elevated sm:max-w-md sm:animate-scale-in sm:rounded-2xl"
      >
        {!hideTitle && (
          <div className="flex items-center justify-between gap-4">
            <h2 id="modal-title" className="text-senior-lg font-bold text-ink">
              {title}
            </h2>
            {dismissable && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex min-h-tap min-w-tap items-center justify-center rounded-xl text-ink-secondary transition active:scale-95 active:bg-surface-alt"
              >
                <Icon name="close" size={22} />
              </button>
            )}
          </div>
        )}
        {hideTitle && dismissable && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute end-4 top-4 z-10 flex min-h-tap min-w-tap items-center justify-center rounded-full bg-surface/90 text-ink-secondary shadow-card transition active:scale-95"
          >
            <Icon name="close" size={20} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
