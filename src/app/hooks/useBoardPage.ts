"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useShallow } from "zustand/shallow";
import { useStore } from "@/store/store";
import { updateCardPosition } from "@/lib/mockApi";
import { broadcast } from "@/app/hooks/useWebSocket";
import { useToast } from "@/context/ToastContext";

export function useBoardPage(boardId: string) {
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

  // Board title and description editing
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

  // Delete confirmation
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

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y)
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

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  // Drag and Drop handlers
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

    if (overData?.type === "column") {
      // If dropped on a column background (e.g. "Add a Card" button), append to end
      destinationColumnId = overData.columnId ?? sourceColumnId;
      newIndex = (useStore.getState().columnCardMap[destinationColumnId] ?? []).length;
    } else {
      // If dropped on a card, use fresh state to avoid stale closure
      destinationColumnId = overData?.columnId ?? sourceColumnId;
      const destinationCards = useStore.getState().columnCardMap[destinationColumnId] ?? [];
      const overIndex = destinationCards.indexOf(over.id as string);

      if (overIndex === -1) {
        newIndex = destinationCards.length;
      } else {
        // Check if the pointer is in the bottom half of the over element
        const overRect = event.over?.rect;
        const pointerY =
          event.activatorEvent instanceof PointerEvent ||
          event.activatorEvent instanceof MouseEvent
            ? event.activatorEvent.clientY + event.delta.y
            : null;

        const isBottomHalf =
          overRect && pointerY
            ? pointerY > overRect.top + overRect.height / 2
            : false;

        const isDroppingAfterLastCard = overIndex === destinationCards.length - 1;

        if (isDroppingAfterLastCard && isBottomHalf) {
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
      }
    }

    const sourceCards = useStore.getState().columnCardMap[sourceColumnId] ?? [];
    const currentIndex = sourceCards.indexOf(activeId);
    if (sourceColumnId === destinationColumnId && currentIndex === newIndex) {
      setActiveDragCardId(null);
      return;
    }

    moveCard({ cardId: activeId, sourceColumnId, destinationColumnId, newIndex });

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

  // Card actions
  const handleCreateCard = useCallback((payload: { columnId: string; title: string }) => {
    const id = crypto.randomUUID();
    createCard({ ...payload, id });
    toast.success("Card created");
    void broadcast({ type: "CARD_CREATED", payload: { ...payload, id } });
  }, [createCard, toast]);

  const handleSaveCard = useCallback((cardId: string, updates: Parameters<typeof editCard>[0]["updates"]) => {
    editCard({ cardId, updates });
    toast.success("Card saved");
    setActiveCardId(null);
  }, [editCard, setActiveCardId, toast]);

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

  return {
    // Board data
    board,
    boardColumnMap,
    columnsById,
    columnCardMap,
    // Active states
    activeCard,
    draggingCard,
    activeDragCardId,
    // Column modal
    showColumnModal,
    setShowColumnModal,
    // Title editing
    isEditingTitle,
    setIsEditingTitle,
    editTitle,
    setEditTitle,
    titleInputRef,
    handleTitleSave,
    startEditTitle,
    // Description editing
    isEditingDescription,
    setIsEditingDescription,
    editDescription,
    setEditDescription,
    descriptionInputRef,
    handleDescriptionSave,
    startEditDescription,
    // Delete confirmation
    pendingDelete,
    setPendingDelete,
    requestDeleteColumn,
    requestDeleteCard,
    handleConfirmDelete,
    // Store actions
    createColumn,
    editColumn,
    setActiveCardId,
    // Card actions
    handleCreateCard,
    handleSaveCard,
    // Drag and Drop
    sensors,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
    // Dev utilities
    seedTestData,
    clearTestData,
  };
}