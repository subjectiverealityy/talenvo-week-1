import { useCallback } from "react";
import type { Board, Column } from "@/types";

type Deps = {
  boardsById: Record<string, Board>;
  columnCardMap: Record<string, string[]>;
  setColumnsById: React.Dispatch<React.SetStateAction<Record<string, Column>>>;
  setBoardColumnMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setCardsById: React.Dispatch<React.SetStateAction<Record<string, import("@/types").Card>>>;
  setColumnCardMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
};

export function useColumnActions(deps: Deps) {
  const {
    boardsById,
    columnCardMap,
    setColumnsById,
    setBoardColumnMap,
    setCardsById,
    setColumnCardMap,
  } = deps;

  const createColumn = useCallback(
    (payload: { boardId: string; title: string }): void => {
      const trimmedTitle = payload.title.trim();
      if (!trimmedTitle || !boardsById[payload.boardId]) return;

      const newId = crypto.randomUUID();
      const newColumn: Column = {
        id: newId,
        title: trimmedTitle,
        boardId: payload.boardId,
      };

      setColumnsById((prev) => ({ ...prev, [newId]: newColumn }));
      setBoardColumnMap((prev) => ({
        ...prev,
        [payload.boardId]: [...(prev[payload.boardId] ?? []), newId],
      }));
      setColumnCardMap((prev) => ({ ...prev, [newId]: [] }));
    },
    [boardsById, setColumnsById, setBoardColumnMap, setColumnCardMap]
  );

  const editColumn = useCallback(
    (payload: { columnId: string; title: string }): void => {
      const trimmedTitle = payload.title.trim();
      if (!trimmedTitle) return;

      setColumnsById((prev) => {
        if (!prev[payload.columnId]) return prev;
        return {
          ...prev,
          [payload.columnId]: { ...prev[payload.columnId], title: trimmedTitle },
        };
      });
    },
    [setColumnsById]
  );

  const deleteColumn = useCallback(
    (payload: { columnId: string }): void => {
      const cardIdsToRemove = columnCardMap[payload.columnId] ?? [];

      setCardsById((prev) => {
        const next = { ...prev };
        cardIdsToRemove.forEach((id) => delete next[id]);
        return next;
      });

      setColumnCardMap((prev) => {
        const next = { ...prev };
        delete next[payload.columnId];
        return next;
      });

      setColumnsById((prev) => {
        const boardId = prev[payload.columnId]?.boardId;
        const next = { ...prev };
        delete next[payload.columnId];

        if (boardId) {
          setBoardColumnMap((prevMap) => ({
            ...prevMap,
            [boardId]: prevMap[boardId].filter((id) => id !== columnId),
          }));
        }

        return next;
      });
    },
    [columnCardMap, setColumnsById, setBoardColumnMap, setCardsById, setColumnCardMap]
  );

  return { createColumn, editColumn, deleteColumn };
}
