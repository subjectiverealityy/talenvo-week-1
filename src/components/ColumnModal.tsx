"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";

type ColumnModalProps = {
  onClose: () => void;
  onAdd: (title: string) => void;
};

export default function ColumnModal({ onClose, onAdd }: ColumnModalProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

  function handleAdd() {
    if (!title.trim()) {
      setError("Column name is required.");
      inputRef.current?.focus();
      return;
    }
    onAdd(title.trim());
    onClose();
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-column-modal-title"
      onClick={handleOverlayClick}
      onKeyDown={trapFocus}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
        <h2 id="add-column-modal-title" className="text-base font-semibold mb-4">
          New Column
        </h2>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <label htmlFor="column-name-input" className="text-sm font-medium">
              Column name
            </label>
            {error && (
              <span id="column-name-error" role="alert" className="text-red-500 text-xs">
                {error}
              </span>
            )}
          </div>
          <input
            ref={inputRef}
            id="column-name-input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="e.g. In Progress"
            aria-describedby={error ? "column-name-error" : undefined}
            aria-invalid={!!error}
            className={`block w-full border p-2 rounded text-sm ${
              error ? "border-red-500" : "border-gray-300"
            }`}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:border-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}