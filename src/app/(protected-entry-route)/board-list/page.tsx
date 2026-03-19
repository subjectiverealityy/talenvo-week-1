"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/shallow";
import { useStore } from "@/store/store";
import BoardCard from "@/components/board/BoardCard";
import CreateBoardModal from "@/components/board/CreateBoardModal";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";

export default function EntryRoute() {
  const router = useRouter();
  const { boardsById, boardIds, createBoard, deleteBoard } = useStore(
    useShallow((state) => ({
      boardsById: state.boardsById,
      boardIds: state.boardIds,
      createBoard: state.createBoard,
      deleteBoard: state.deleteBoard,
    }))
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingBoardDeleteId, setPendingBoardDeleteId] = useState<string | null>(null);

  const handleCreateBoard = useCallback(
    (title: string, description: string) => {
      createBoard({ title, description });
    },
    [createBoard]
  );

  const handleOpenBoard = useCallback(
    (id: string) => {
      router.push(`/board/${id}`);
    },
    [router]
  );

  const handleDeleteBoard = useCallback(
    (id: string) => {
      setPendingBoardDeleteId(id);
    },
    [setPendingBoardDeleteId]
  );

  const handleConfirmDeleteBoard = useCallback(() => {
    if (!pendingBoardDeleteId) return;
    deleteBoard({ boardId: pendingBoardDeleteId });
    setPendingBoardDeleteId(null);
  }, [deleteBoard, pendingBoardDeleteId]);

  // Current workaround for empty state flash on board list load, pending fetching board data from a database on the server.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

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

      <section aria-label="Board list" className="mb-8">
        <button
          onClick={() => setShowCreateModal(true)}
          aria-label="Create new board"
          className="mx-auto mb-8 w-16 h-16 rounded-full bg-gray-800 text-white text-3xl flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          +
        </button>
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

      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateBoard}
        />
      )}

      {pendingBoardDeleteId && (
        <ConfirmDeleteModal
          onCancel={() => setPendingBoardDeleteId(null)}
          onConfirm={handleConfirmDeleteBoard}
          itemLabel="board"
        />
      )}

    </main>
  );
}
