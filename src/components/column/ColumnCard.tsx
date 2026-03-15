"use client";

import { useState, useRef, memo } from "react";
import type { Card, Column } from "@/types";
import CardItem from "@/components/card/CardItem";

type ColumnCardProps = {
  column: Column;
  cardIds: string[];
  cardsById: Record<string, Card>;
  onEditColumn: (payload: { columnId: string; title: string }) => void;
  onDeleteColumn: (payload: { columnId: string }) => void;
  onCreateCard: (payload: { columnId: string; title: string }) => void;
  onOpenCard: (cardId: string) => void;
  onDeleteCard: (payload: { cardId: string }) => void;
};

export default memo(function ColumnCard({
  column,
  cardIds,
  cardsById,
  onEditColumn,
  onDeleteColumn,
  onCreateCard,
  onOpenCard,
  onDeleteCard,
}: ColumnCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  function handleTitleSave() {
    if (editTitle.trim()) {
      onEditColumn({ columnId: column.id, title: editTitle });
    } else {
      // Revert to the original title if the input field is empty.
      setEditTitle(column.title);
    }
    setIsEditingTitle(false);
  };

  function handleEditTitle() {
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  function handleAddCardClick() {
    setIsAddingCard(true);
    setTimeout(() => cardInputRef.current?.focus(), 0);
  };

  function handleAddCard() {
    if (!newCardTitle.trim()) {
      setIsAddingCard(false);
      return;
    }
    onCreateCard({ columnId: column.id, title: newCardTitle });
    setNewCardTitle("");
    setIsAddingCard(false);
  };

  return (
    <section
      className="bg-gray-100 border border-gray-200 rounded-lg p-4 w-64 min-w-[18rem] shrink-0 flex flex-col gap-3 max-h-full overflow-y-auto"
      aria-label={`Column: ${column.title}`}
    >
      <header className="flex items-center justify-between gap-2">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
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
            className="text-sm font-semibold flex-1 min-w-0 wrap-break-word cursor-pointer hover:bg-gray-200 rounded px-2 py-0.5"
            onClick={handleEditTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleEditTitle();
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
          onClick={() => onDeleteColumn({ columnId: column.id })}
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
            <CardItem
              key={cardId}
              card={card}
              onOpen={onOpenCard}
              onDelete={onDeleteCard}
            />
          );
        })}
      </ul>

      {isAddingCard ? (
        <>
          <label htmlFor={`new-card-${column.id}`} className="sr-only">
            Card title
          </label>
          <input
            ref={cardInputRef}
            id={`new-card-${column.id}`}
            type="text"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            onBlur={handleAddCard}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddCard();
              if (e.key === "Escape") {
                setIsAddingCard(false);
                setNewCardTitle("");
              }
            }}
            placeholder="Card title"
            className="block w-full border border-gray-300 p-2 rounded text-sm bg-white"
          />
        </>
      ) : (
        <button
          onClick={handleAddCardClick}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
          aria-label={`Add a card to ${column.title}`}
        >
          + Add a Card
        </button>
      )}
    </section>
  );
});
