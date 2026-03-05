"use client";

import { useState, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceContext } from "../store/workspaceStore";
import type { Board } from "../store/workspaceStore";
import BoardInputField from "../components/BoardInputField";

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
          <h2 className="font-semibold">{board.title}</h2>
          <button
            onClick={handleDelete}
            aria-label={`Delete board: ${board.title}`}
            className="text-gray-400 hover:text-red-500 text-sm px-1"
          >
            ✕
          </button>
        </div>
        {board.description && (
          <p className="text-sm text-gray-600 mt-1">{board.description}</p>
        )}
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

export default function EntryRoute() {
  const router = useRouter();
  const { boardsById, boardIds, createBoard, deleteBoard } =
    useWorkspaceContext();

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [titleError, setTitleError] = useState("");

  const handleCreateBoard = useCallback(() => {
    if (!newTitle.trim()) {
      setTitleError("Oops! You can't create a board without a title.");
      return;
    }
    createBoard(newTitle, newDescription);
    setNewTitle("");
    setNewDescription("");
    setTitleError("");
  }, [newTitle, newDescription, createBoard]);

  const handleOpenBoard = useCallback(
    (id: string) => {
      router.push(`/boards/${id}`);
    },
    [router]
  );

  const handleDeleteBoard = useCallback(
    (id: string) => {
      deleteBoard(id);
    },
    [deleteBoard]
  );

  return (
    <main className="p-16">
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Welcome to your BoardList</h1>
        <p className="text-sm text-gray-500">
          {boardIds.length === 0
            ? "No boards yet — create one below."
            : `${boardIds.length} board${boardIds.length !== 1 ? "s" : ""}`}
        </p>
      </header>

      <section aria-label="Create a new board" className="mb-8">
        <BoardInputField
          id="board-title"
          label="Board title"
          value={newTitle}
          onChange={(v) => {
            setNewTitle(v);
            if (titleError) setTitleError("");
          }}
          placeholder="Give your new board a name"
          error={titleError}
        />
        <BoardInputField
          id="board-description"
          label="Description (optional)"
          value={newDescription}
          onChange={setNewDescription}
          placeholder="Give your new board a description"
        />
        <button
          className="bg-gray-200 border px-4 py-2 rounded mb-4"
          onClick={handleCreateBoard}
          aria-label="Create new board"
        >
          Create Board
        </button>
      </section>

      <section aria-label="Board list">
        <ul role="list">
          {boardIds.map((id) => {
            const board = boardsById[id];
            if (!board) return null;
            return (
              <BoardCard
                key={id}
                board={board}
                onOpen={handleOpenBoard}
                onDelete={handleDeleteBoard}
              />
            );
          })}
        </ul>
      </section>
    </main>
  );
}