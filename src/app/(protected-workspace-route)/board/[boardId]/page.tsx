"use client";

import { useState, useEffect } from "react";
import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { useParams, useRouter } from "next/navigation";
import ColumnCard from "@/components/column/ColumnCard";
import ColumnModal from "@/components/column/ColumnModal";
import CardModal from "@/components/card/CardModal";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { useWebSocket } from "@/app/hooks/useWebSocket";
import { useBoardPage } from "@/app/hooks/useBoardPage";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const {
    board,
    boardColumnMap,
    columnsById,
    columnCardMap,
    activeCard,
    draggingCard,
    showColumnModal,
    setShowColumnModal,
    isEditingTitle,
    setIsEditingTitle,
    editTitle,
    setEditTitle,
    titleInputRef,
    handleTitleSave,
    startEditTitle,
    isEditingDescription,
    setIsEditingDescription,
    editDescription,
    setEditDescription,
    descriptionInputRef,
    handleDescriptionSave,
    startEditDescription,
    pendingDelete,
    setPendingDelete,
    requestDeleteColumn,
    requestDeleteCard,
    handleConfirmDelete,
    createColumn,
    editColumn,
    setActiveCardId,
    handleCreateCard,
    handleSaveCard,
    sensors,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
    seedTestData,
    clearTestData,
  } = useBoardPage(boardId);

  useWebSocket();

  // Current workaround for 404 page flashing on page reload, pending fetching board data from a database on the server.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null; // loading.tsx shows instead

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
                <span className="text-gray-300 italic">[add a description]</span>
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-hidden">
          <div
            className="flex gap-4 p-6 h-full overflow-x-auto items-start"
            role="region"
            aria-label="Board columns"
          >
            {columnIds.length === 0 ? (
              <p className="text-sm text-gray-400">You haven&apos;t created any columns yet.</p>
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
                    onEditColumn={editColumn}
                    onDeleteColumn={requestDeleteColumn}
                    onCreateCard={handleCreateCard}
                    onOpenCard={setActiveCardId}
                    onDeleteCard={requestDeleteCard}
                  />
                );
              })
            )}
          </div>
        </div>

        <DragOverlay>
          {draggingCard ? (
            <div className="bg-white border border-gray-200 rounded p-3 shadow-md w-60">
              <div className="text-sm font-medium wrap-break-word">{draggingCard.title}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showColumnModal && (
        <ColumnModal
          onClose={() => setShowColumnModal(false)}
          onAdd={(title) => {
            createColumn({ boardId, title });
          }}
        />
      )}

      {activeCard && (
        <CardModal
          card={activeCard}
          onClose={() => setActiveCardId(null)}
          onSave={(updates) => handleSaveCard(activeCard.id, updates)}
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
          itemLabel={pendingDelete.type}
        />
      )}

      {/* Dev-only performance testing utilities */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 flex gap-2 z-50">
          <button
            onClick={seedTestData}
            className="bg-red-500 text-white text-xs px-3 py-1 rounded shadow"
          >
            Seed 210 cards
          </button>
          <button
            onClick={clearTestData}
            className="bg-gray-500 text-white text-xs px-3 py-1 rounded shadow"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}