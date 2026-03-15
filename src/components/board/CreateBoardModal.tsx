"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import BoardInputField from "@/components/board/BoardInputField";

type CreateBoardModalProps = {
  onClose: () => void;
  onCreate: (title: string, description: string) => void;
};

export default function CreateBoardModal({ onClose, onCreate }: CreateBoardModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleError, setTitleError] = useState("");

  const overlayRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
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
    if (focusable.length === 0) return;
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

  function handleSubmit() {
    if (!title.trim()) {
      setTitleError("Oops! You can't create a board without a title.");
      titleInputRef.current?.focus();
      return;
    }
    onCreate(title.trim(), description.trim());
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
      aria-labelledby="create-board-modal-title"
      onClick={handleOverlayClick}
      onKeyDown={trapFocus}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
        <h2 id="create-board-modal-title" className="text-base font-semibold mb-4">
          Create a Board
        </h2>

        <div className="flex flex-col gap-4">
          <BoardInputField
            ref={titleInputRef}
            id="board-title"
            label="Board title"
            value={title}
            onChange={(v) => {
              setTitle(v);
              if (titleError) setTitleError("");
            }}
            placeholder="Give your new board a name"
            error={titleError}
          />
          <BoardInputField
            id="board-description"
            label="Description (optional)"
            value={description}
            onChange={setDescription}
            placeholder="Give your new board a description"
          />
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:border-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Create Board
          </button>
        </div>
      </div>
    </div>
  );
}