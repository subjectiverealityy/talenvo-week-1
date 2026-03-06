"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
} from "react";
import type { Card } from "@/store/workspaceStore";

type CardModalProps = {
  card: Card;
  onClose: () => void;
  onSave: (updates: Partial<Omit<Card, "id" | "columnId">>) => void;
};

export default function CardModal({ card, onClose, onSave }: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [tagsInput, setTagsInput] = useState(card.tags.join(", "));
  const [dueDate, setDueDate] = useState(
    card.dueDate
      ? new Date(card.dueDate).toISOString().substring(0, 10)
      : ""
  );
  const [titleError, setTitleError] = useState("");

  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();
    return () => previouslyFocused?.focus();
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
      'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
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

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      setTitleError("Title is required.");
      return;
    }
    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      title: title.trim(),
      description,
      tags: parsedTags,
      dueDate: dueDate ? new Date(dueDate) : null,
    });
  }, [title, description, tagsInput, dueDate, onSave]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-modal-title"
      onClick={handleOverlayClick}
      onKeyDown={trapFocus}
    >
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
        <header className="flex items-center justify-between p-6 pb-0">
          <h2 id="card-modal-title" className="text-base font-semibold">
            Edit Card
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close modal"
            className="text-gray-400 hover:text-gray-700 text-sm px-1"
          >
            ✕
          </button>
        </header>

        <div className="p-6 flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="card-title" className="text-sm font-medium">
                Title
              </label>
              {titleError && (
                <span id="card-title-error" role="alert" className="text-red-500 text-xs">
                  {titleError}
                </span>
              )}
            </div>
            <input
              id="card-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError("");
              }}
              aria-describedby={titleError ? "card-title-error" : undefined}
              aria-invalid={!!titleError}
              className={`block w-full border p-2 rounded text-sm ${
                titleError ? "border-red-500" : "border-gray-300"
              }`}
            />
          </div>

          <div>
            <label htmlFor="card-description" className="text-sm font-medium block mb-1">
              Description
            </label>
            <textarea
              id="card-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={5}
              className="block w-full border border-gray-300 p-2 rounded text-sm resize-none"
            />
          </div>

          <div>
            <label htmlFor="card-tags" className="text-sm font-medium block mb-1">
              Tags
            </label>
            <input
              id="card-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="separate tags with a comma e.g. school project, to-do, idea"
              className="block w-full border border-gray-300 p-2 rounded text-sm"
            />
          </div>

          <div>
            <label htmlFor="card-due-date" className="text-sm font-medium block mb-1">
              Due date
            </label>
            <input
              id="card-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="block w-full border border-gray-300 p-2 rounded text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              By clicking on the calendar icon, you can set a due date or remove a due date by clicking 'clear'.
            </p>
          </div>
        </div>

        <footer className="flex justify-end gap-2 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:border-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}