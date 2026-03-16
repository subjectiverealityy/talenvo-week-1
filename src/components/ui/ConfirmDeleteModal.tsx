"use client";

import { useEffect, useRef, KeyboardEvent } from "react";

type ConfirmDeleteModalProps = {
  onConfirm: () => void;
  onCancel: () => void;
  itemLabel?: string;
};

export default function ConfirmDeleteModal({
  onConfirm,
  onCancel,
  itemLabel = "item",
}: ConfirmDeleteModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function trapFocus(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab" || !overlayRef.current) return;
    const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
      'button, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onCancel();
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      onClick={handleOverlayClick}
      onKeyDown={trapFocus}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
        <h2 id="confirm-delete-title" className="text-base font-semibold mb-3">
          Confirm your deletion request.
        </h2>
        <p className="text-sm text-gray-600">
          Are you sure you want to{" "}
          <span className="text-red-600 font-semibold">delete</span> that?<br />
          <strong className="font-semibold">This action cannot be undone.</strong>
        </p>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:border-gray-500"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            aria-label={`Delete ${itemLabel}`}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
