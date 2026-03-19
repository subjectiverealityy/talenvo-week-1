"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";

type AuthorModalProps = {
  onConfirm: (name: string) => void;
  onCancel: () => void;
};

export default function AuthorModal({ onConfirm, onCancel }: AuthorModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
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
      'button, input, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function handleConfirm() {
    if (!name.trim()) {
      setError("Please enter a name to continue.");
      inputRef.current?.focus();
      return;
    }
    onConfirm(name.trim());
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
      aria-labelledby="author-modal-title"
      onClick={handleOverlayClick}
      onKeyDown={trapFocus}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
        <h2 id="author-modal-title" className="text-base font-semibold mb-1">
          What name would you like to comment with?
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          This will be shown on all your comments.
        </p>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <label htmlFor="author-name-input" className="text-sm font-medium">
              Display name
            </label>
            {error && (
              <span id="author-name-error" role="alert" className="text-red-500 text-xs">
                {error}
              </span>
            )}
          </div>
          <input
            ref={inputRef}
            id="author-name-input"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
            }}
            placeholder=""
            aria-describedby={error ? "author-name-error" : undefined}
            aria-invalid={!!error}
            className={`block w-full border p-2 rounded text-sm ${
              error ? "border-red-500" : "border-gray-300"
            }`}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:border-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}