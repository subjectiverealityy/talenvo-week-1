"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspaceContext } from "@/store/workspaceStore";
import ColumnCard from "@/components/ColumnCard";
import ColumnModal from "@/components/ColumnModal";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const {
    boardsById,
    columnsById,
    boardColumnMap,
    columnCardMap,
    cardsById,
    createColumn,
    editColumn,
    deleteColumn,
  } = useWorkspaceContext();

  const [showColumnModal, setShowColumnModal] = useState(false);

  const board = boardsById[boardId];

  if (!board) {
    return (
      <div className="h-screen flex flex-col">
        <div className="p-6">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Go back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-3xl text-gray-800 italic">Board not found.</h1>
        </div>
      </div>
    );
  }

  const columnIds = boardColumnMap[boardId] ?? [];

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center p-6 border-b flex-shrink-0 justify-between">
        <button
          onClick={() => router.push("/")}
          aria-label="Back to dashboard"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back
        </button>
        <div className="text-right flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold">{board.title}</h1>
            {board.description && (
              <p className="text-sm text-gray-500 mt-0.5">{board.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowColumnModal(true)}
            aria-label="Add new column"
            className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 whitespace-nowrap"
          >
            + Add Column
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div
          className="flex gap-4 p-6 h-full overflow-x-auto items-start"
          role="region"
          aria-label="Board columns"
        >
          {columnIds.length === 0 ? (
            <p className="text-sm text-gray-400">You haven't created any columns yet.</p>
          ) : (
            columnIds.map((colId) => {
              const column = columnsById[colId];
              if (!column) return null;
              const cardIds = columnCardMap[colId] ?? [];
              return (
                <ColumnCard
                  key={colId}
                  column={column}
                  cardIds={cardIds}
                  cardsById={cardsById}
                  onEditColumn={editColumn}
                  onDeleteColumn={deleteColumn}
                />
              );
            })
          )}
        </div>
      </div>

      {showColumnModal && (
        <ColumnModal
          onClose={() => setShowColumnModal(false)}
          onAdd={(title) => createColumn(boardId, title)}
        />
      )}
    </div>
  );
}