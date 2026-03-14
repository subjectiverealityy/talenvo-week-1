"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/store";
import BoardInputField from "@/components/board/BoardInputField";
import BoardCard from "@/components/board/BoardCard";

export default function EntryRoute() {
  const router = useRouter();
  const { boardsById, boardIds, createBoard, deleteBoard } =
    useStore();

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [titleError, setTitleError] = useState("");

  const handleCreateBoard = useCallback(() => {
  if (!newTitle.trim()) {
    setTitleError("Oops! You can't create a board without a title.");
    return;
  }
  createBoard({ title: newTitle, description: newDescription });
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
      deleteBoard({ boardId: id });
    },
    [deleteBoard]
  );

  return (
    <main className="p-16 max-w-xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Welcome to your BoardList</h1>
        <p className="text-sm text-gray-500">
          {boardIds.length === 0
            ? "No boards yet — create one below."
            : `${boardIds.length} board${boardIds.length !== 1 ? "s" : ""}`}
        </p>
      </header>

      <section aria-label="Create a new board" className="mb-8 max-xl">
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
          className="bg-gray-200 border px-4 py-2 rounded mb-4 cursor-pointer"
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