"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/icons/Icon";

type ToastVariant = "success" | "info" | "error";
type Toast = { id: number; message: string; variant: ToastVariant };

const ToastContext = createContext<((message: string, variant?: ToastVariant) => void) | null>(null);

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "bg-ink text-white",
  info: "bg-ink text-white",
  error: "bg-danger text-white",
};

const VARIANT_ICON: Record<ToastVariant, "check-circle" | "info" | "alert-triangle"> = {
  success: "check-circle",
  info: "info",
  error: "alert-triangle",
};

export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("useToast must be used within ToastProvider");
  return showToast;
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pe-8"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex max-w-sm animate-toast-in items-center gap-2 rounded-xl px-4 py-3 text-senior-sm font-medium shadow-elevated ${VARIANT_CLASSES[toast.variant]}`}
          >
            <Icon name={VARIANT_ICON[toast.variant]} size={18} />
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
