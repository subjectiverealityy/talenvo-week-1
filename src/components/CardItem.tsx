"use client";

import { memo } from "react";
import type { Card } from "@/store/workspaceStore";
import { parseMarkdown } from "@/lib/parseMarkdown";

type CardItemProps = {
  card: Card;
  onOpen: (cardId: string) => void;
  onDelete: (cardId: string) => void;
};

const CardItem = memo(function CardItem({ card, onOpen, onDelete }: CardItemProps) {
  const isOverdue =
    card.dueDate !== null && new Date(card.dueDate) < new Date();

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(card.id);
  }

  return (
    <li>
      <article
        className="bg-white border border-gray-200 rounded p-3 cursor-pointer hover:shadow-sm transition-shadow"
        onClick={() => onOpen(card.id)}
        tabIndex={0}
        role="button"
        aria-label={`Open card: ${card.title}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(card.id);
          }
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium min-w-0 wrap-break-word">{card.title}</span>
          <button
            onClick={handleDelete}
            aria-label={`Delete card: ${card.title}`}
            className="text-gray-300 hover:text-red-500 text-xs px-1 shrink-0"
          >
            ✕
          </button>
        </div>

        {card.description && (
          <div
            className="text-xs text-gray-500 mt-1 line-clamp-2 prose prose-xs wrap-break-word"
            aria-label="Card description"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(card.description) }}
          />
        )}

        {card.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1 mt-2" aria-label="Tags" role="list">
            {card.tags.map((tag) => (
              <li
                key={tag}
                className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        {card.dueDate && (
          <time
            className={`block mt-2 text-xs ${isOverdue ? "text-red-500" : "text-gray-400"}`}
            dateTime={new Date(card.dueDate).toISOString()}
            aria-label={`Due date: ${new Date(card.dueDate).toLocaleDateString()}`}
          >
            {isOverdue && "Overdue ("}
            {new Date(card.dueDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
            {isOverdue && ")"}
          </time>
        )}
      </article>
    </li>
  );
});

export default CardItem;