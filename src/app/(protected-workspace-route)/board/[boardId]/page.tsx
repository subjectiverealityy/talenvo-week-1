"use client";

import { useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspaceContext } from "@/store/store";
import ColumnCard from "@/components/column/ColumnCard";
import ColumnModal from "@/components/column/ColumnModal";
import CardModal from "@/components/card/CardModal";

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
    editBoard,
    editColumn,
    deleteColumn,
    createCard,
    editCard,
    deleteCard,
    visualState,
    setActiveCardId,
  } = useWorkspaceContext();

  const [showColumnModal, setShowColumnModal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  const board = boardsById[boardId];
  const activeCard = visualState.activeCardId ? cardsById[visualState.activeCardId] : null;

  const handleTitleSave = useCallback(() => {
    if (editTitle.trim()) {
      editBoard(boardId, { title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  }, [editTitle, boardId, editBoard]);

  const handleDescriptionSave = useCallback(() => {
    editBoard(boardId, { description: editDescription.trim() });
    setIsEditingDescription(false);
  }, [editDescription, boardId, editBoard]);

  function startEditTitle() {
    setEditTitle(board?.title ?? "");
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  function startEditDescription() {
    setEditDescription(board?.description ?? "");
    setIsEditingDescription(true);
    setTimeout(() => descriptionInputRef.current?.focus(), 0);
  }

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
      <header className="flex items-center p-6 border-b shrink-0 justify-between">
        <button
          onClick={() => router.push("/")}
          aria-label="Back to dashboard"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back
        </button>
        <div className="text-right overflow-hidden">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSave();
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              className="text-xl font-bold border-b border-gray-400 outline-none bg-transparent text-right"
              aria-label="Edit board title"
            />
          ) : (
            <h1
              className="text-xl font-bold cursor-pointer hover:opacity-70"
              onClick={startEditTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  startEditTitle();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Edit board title: ${board.title}`}
            >
              {board.title}
            </h1>
          )}

          {isEditingDescription ? (
            <input
              ref={descriptionInputRef}
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onBlur={handleDescriptionSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDescriptionSave();
                if (e.key === "Escape") setIsEditingDescription(false);
              }}
              className="text-sm text-gray-500 border-b border-gray-300 outline-none bg-transparent mt-0.5 text-right w-full"
              aria-label="Edit board description"
            />
          ) : (
            <p
              className="text-sm text-gray-500 mt-0.5 cursor-pointer hover:opacity-70"
              onClick={startEditDescription}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  startEditDescription();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Edit board description: ${board.description || "No description"}`}
            >
              {board.description || (
                <span className="text-gray-300 italic">Add a description...</span>
              )}
            </p>
          )}
        </div>
      </header>

      <div className="px-6 pt-4 shrink-0">
        <button
          onClick={() => setShowColumnModal(true)}
          aria-label="Add new column"
          className="bg-gray-800 text-white px-4 py-2 rounded text-sm whitespace-nowrap cursor-pointer"
        >
          + Add a Column
        </button>
      </div>

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
                  onCreateCard={createCard}
                  onOpenCard={setActiveCardId}
                  onDeleteCard={deleteCard}
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

      {activeCard && (
        <CardModal
          card={activeCard}
          onClose={() => setActiveCardId(null)}
          onSave={(updates) => {
            editCard(activeCard.id, updates);
            setActiveCardId(null);
          }}
        />
      )}
    </div>
  );
}