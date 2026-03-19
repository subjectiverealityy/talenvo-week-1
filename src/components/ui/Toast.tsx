"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastProps = {
  toast: Toast;
  onDismiss: (id: string) => void;
};

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "i",
};

const STYLES: Record<ToastType, string> = {
  success: "bg-gray-800 text-white",
  error: "bg-red-600 text-white",
  info: "bg-white text-gray-800 border border-gray-200",
};

const ICON_STYLES: Record<ToastType, string> = {
  success: "bg-white/20 text-white",
  error: "bg-white/20 text-white",
  info: "bg-gray-100 text-gray-600",
};

export function ToastItem({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  // Trigger enter animation on mount.
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss after 4 seconds.
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm
        transition-all duration-300 ease-out max-w-sm w-full
        ${STYLES[toast.type]}
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
      `}
    >
      <span
        className={`
          w-5 h-5 rounded-full flex items-center justify-center
          text-xs font-bold shrink-0
          ${ICON_STYLES[toast.type]}
        `}
      >
        {ICONS[toast.type]}
      </span>
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity text-xs ml-1"
      >
        ✕
      </button>
    </div>
  );
}