"use client";

import { memo } from "react";
import type { Board } from "@/store/workspaceStore";

type BoardCardProps = {
  board: Board;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

const BoardCard = memo(function BoardCard({
  board,
  onOpen,
  onDelete,
}: BoardCardProps) {
  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(board.id);
  }

  return (
    <li>
      <article
        onClick={() => onOpen(board.id)}
        tabIndex={0}
        role="button"
        aria-label={`Open board: ${board.title}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(board.id);
          }
        }}
        className="border p-4 mb-2 rounded cursor-pointer hover:bg-gray-50"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 overflow-hidden">
            <h2 className="font-semibold wrap-break-words">{board.title}</h2>
            {board.description && (
              <p className="text-sm text-gray-600 mt-1 wrap-break-words">{board.description}</p>
            )}
          </div>
          <button
            onClick={handleDelete}
            aria-label={`Delete board: ${board.title}`}
            className="text-gray-400 hover:text-red-500 text-sm px-1 shrink-0"
          >
            ✕
          </button>
        </div>
        <time
          className="text-xs text-gray-400 mt-2 block"
          dateTime={board.dateCreated.toISOString()}
        >
          {board.dateCreated.toLocaleDateString()}
        </time>
      </article>
    </li>
  );
});

export default BoardCard;