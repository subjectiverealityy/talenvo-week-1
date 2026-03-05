"use client";

import { useState, useCallback, useRef, memo } from "react";
import type { Card, Column } from "@/app/store/workspaceStore";

type ColumnCardProps = {
  column: Column;
  cardIds: string[];
  cardsById: Record<string, Card>;
  onEditColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
};

const ColumnCard = memo(function ColumnCard({
  column,
  cardIds,
  cardsById,
  onEditColumn,
  onDeleteColumn,
}: ColumnCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleSaveTitle = useCallback(() => {
    if (editTitle.trim()) {
      onEditColumn(column.id, editTitle);
    } else {
      setEditTitle(column.title);
    }
    setIsEditingTitle(false);
  }, [editTitle, column.id, column.title, onEditColumn]);

  function startEditTitle() {
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  return (
    <section
      className="bg-gray-100 rounded-lg p-4 w-64 min-w-[16rem] shrink-0 flex flex-col gap-3 max-h-full overflow-y-auto"
      aria-label={`Column: ${column.title}`}
    >
      <header className="flex items-center justify-between gap-2">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle();
              if (e.key === "Escape") {
                setEditTitle(column.title);
                setIsEditingTitle(false);
              }
            }}
            className="flex-1 text-sm font-semibold border border-gray-400 rounded px-2 py-0.5 bg-white outline-none"
            aria-label="Edit column name"
          />
        ) : (
          <h2
            className="text-sm font-semibold flex-1 cursor-pointer hover:bg-gray-200 rounded px-2 py-0.5"
            onClick={startEditTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                startEditTitle();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Edit column name: ${column.title}`}
          >
            {column.title}
          </h2>
        )}
        <button
          onClick={() => onDeleteColumn(column.id)}
          aria-label={`Delete column: ${column.title}`}
          className="text-gray-400 hover:text-red-500 text-xs px-1 shrink-0"
        >
          ✕
        </button>
      </header>

      <ul className="flex flex-col gap-2" role="list" aria-label={`Cards in ${column.title}`}>
        {cardIds.map((cardId) => {
          const card = cardsById[cardId];
          if (!card) return null;
          return (
            <li key={cardId} className="bg-white border border-gray-200 rounded p-2 text-sm">
              {card.title}
            </li>
          );
        })}
      </ul>

      <button
        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
        aria-label={`Add a card to ${column.title}`}
      >
        + Add a Card
      </button>
    </section>
  );
});

export default ColumnCard;