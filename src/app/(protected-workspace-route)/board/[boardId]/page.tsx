"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useParams, useRouter } from "next/navigation";
import { useShallow } from "zustand/shallow";
import { useStore } from "@/store/store";
import { updateCardPosition } from "@/lib/mockApi";
import ColumnCard from "@/components/column/ColumnCard";
import ColumnModal from "@/components/column/ColumnModal";
import CardModal from "@/components/card/CardModal";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { useWebSocket, broadcast } from "@/app/hooks/useWebSocket";
import { useToast } from "@/context/ToastContext";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const { toast } = useToast();

  const {
    boardsById,
    columnsById,
    boardColumnMap,
    columnCardMap,
    createColumn,
    editBoard,
    editColumn,
    deleteColumn,
    createCard,
    editCard,
    deleteCard,
    moveCard,
    setActiveCardId,
    undo,
    redo,
  } = useStore(
    useShallow((state) => ({
      boardsById: state.boardsById,
      columnsById: state.columnsById,
      boardColumnMap: state.boardColumnMap,
      columnCardMap: state.columnCardMap,
      createColumn: state.createColumn,
      editBoard: state.editBoard,
      editColumn: state.editColumn,
      deleteColumn: state.deleteColumn,
      createCard: state.createCard,
      editCard: state.editCard,
      deleteCard: state.deleteCard,
      moveCard: state.moveCard,
      setActiveCardId: state.setActiveCardId,
      undo: state.undo,
      redo: state.redo,
    }))
  );

  const [showColumnModal, setShowColumnModal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    type: "column" | "card";
    id: string;
  } | null>(null);

  const [activeDragCardId, setActiveDragCardId] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  const board = boardsById[boardId];
  const activeCard = useStore((state) => {
    const activeId = state.activeCardId;
    return activeId ? state.cardsById[activeId] : null;
  });

  const draggingCard = useStore((state) =>
    activeDragCardId ? state.cardsById[activeDragCardId] : null
  );

  const handleTitleSave = useCallback(() => {
    if (editTitle.trim()) {
      editBoard({ boardId, updates: { title: editTitle.trim() } });
    }
    setIsEditingTitle(false);
  }, [editTitle, boardId, editBoard]);

  const handleDescriptionSave = useCallback(() => {
    editBoard({ boardId, updates: { description: editDescription.trim() } });
    setIsEditingDescription(false);
  }, [editDescription, boardId, editBoard]);

  const requestDeleteColumn = useCallback((payload: { columnId: string }) => {
    setPendingDelete({ type: "column", id: payload.columnId });
  }, []);

  const requestDeleteCard = useCallback((payload: { cardId: string }) => {
    setPendingDelete({ type: "card", id: payload.cardId });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    if (pendingDelete.type === "column") {
      deleteColumn({ columnId: pendingDelete.id });
      toast.success("Column deleted");
    } else {
      deleteCard({ cardId: pendingDelete.id });
      toast.success("Card deleted");
    }
    setPendingDelete(null);
  }, [deleteCard, deleteColumn, pendingDelete, toast]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
    }

    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
    const modKey = isMac ? event.metaKey : event.ctrlKey;
    if (!modKey) return;

    const key = event.key.toLowerCase();
    if (key === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }

    if (key === "y" && !isMac) {
      event.preventDefault();
      redo();
    }
  }, [undo, redo]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useWebSocket();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeData = event.active.data.current as { type?: string } | undefined;
    if (activeData?.type === "card") {
      setActiveDragCardId(event.active.id as string);
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragCardId(null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveDragCardId(null);
      return;
    }

    const activeId = active.id as string;
    const activeData = active.data.current as { type?: string; columnId?: string } | undefined;
    if (!activeData?.columnId) {
      setActiveDragCardId(null);
      return;
    }

    const sourceColumnId = activeData.columnId;
    let destinationColumnId = sourceColumnId;
    let newIndex = 0;

    const overData = over.data.current as { type?: string; columnId?: string } | undefined;
    destinationColumnId = overData?.columnId ?? sourceColumnId;
    const destinationCards = columnCardMap[destinationColumnId] ?? [];
    const overIndex = destinationCards.indexOf(over.id as string);

    // If overIndex is -1, the drop target wasn't a recognised card in this column
    // (e.g. dropped into a new column but not directly over a card) — append to end.
    if (overIndex === -1) {
      newIndex = destinationCards.length;
    } else {
      newIndex = overIndex;
      if (sourceColumnId === destinationColumnId) {
        const activeIndex = destinationCards.indexOf(activeId);
        if (activeIndex !== -1 && activeIndex < newIndex) {
          newIndex -= 1;
        }
      }
    }

    const sourceCards = columnCardMap[sourceColumnId] ?? [];
    const currentIndex = sourceCards.indexOf(activeId);
    if (sourceColumnId === destinationColumnId && currentIndex === newIndex) {
      setActiveDragCardId(null);
      return;
    }

    moveCard({
      cardId: activeId,
      sourceColumnId,
      destinationColumnId,
      newIndex,
    });

    void broadcast({
      type: "CARD_MOVED",
      payload: { cardId: activeId, sourceColumnId, destinationColumnId, newIndex },
    });

    void updateCardPosition({
      cardId: activeId,
      sourceColumnId,
      destinationColumnId,
      newIndex,
    }).catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to persist card move", error);
      }
      toast.error("Failed to move card");
    });

    setActiveDragCardId(null);
  }, [columnCardMap, moveCard, toast]);

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

  // Dev-only performance testing utilities
  function seedTestData() {
    const store = useStore.getState();
    for (let c = 0; c < 21; c++) {
      store.createColumn({ boardId, title: `Column ${c + 1}` });
      const colId = useStore.getState().boardColumnMap[boardId].at(-1)!;
      for (let k = 0; k < 10; k++) {
        store.createCard({
          columnId: colId,
          title: `Card ${c + 1}-${k + 1}`,
          description: k % 2 === 0 ? "**markdown** description" : undefined,
          tags: k % 3 === 0 ? ["tag1", "tag2"] : [],
        });
      }
    }
  }

  function clearTestData() {
    const store = useStore.getState();
    const colIds = store.boardColumnMap[boardId] ?? [];
    colIds.forEach((colId) => store.deleteColumn({ columnId: colId }));
  }

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
                    onCreateCard={(payload) => {
                      const id = crypto.randomUUID();
                      createCard({ ...payload, id });
                      toast.success("Card created");
                      void broadcast({ type: "CARD_CREATED", payload: { ...payload, id } });
                    }}
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
            toast.success("Column created");
          }}
        />
      )}

      {activeCard && (
        <CardModal
          card={activeCard}
          onClose={() => setActiveCardId(null)}
          onSave={(updates) => {
            editCard({ cardId: activeCard.id, updates });
            toast.success("Card saved");
            setActiveCardId(null);
          }}
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