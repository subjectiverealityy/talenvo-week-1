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
    (boardId: string, title: string): void => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle || !boardsById[boardId]) return;

      const newId = crypto.randomUUID();
      const newColumn: Column = { id: newId, title: trimmedTitle, boardId };

      setColumnsById((prev) => ({ ...prev, [newId]: newColumn }));
      setBoardColumnMap((prev) => ({
        ...prev,
        [boardId]: [...(prev[boardId] ?? []), newId],
      }));
      setColumnCardMap((prev) => ({ ...prev, [newId]: [] }));
    },
    [boardsById, setColumnsById, setBoardColumnMap, setColumnCardMap]
  );

  const editColumn = useCallback(
    (columnId: string, title: string): void => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      setColumnsById((prev) => {
        if (!prev[columnId]) return prev;
        return { ...prev, [columnId]: { ...prev[columnId], title: trimmedTitle } };
      });
    },
    [setColumnsById]
  );

  const deleteColumn = useCallback(
    (columnId: string): void => {
      const cardIdsToRemove = columnCardMap[columnId] ?? [];

      setCardsById((prev) => {
        const next = { ...prev };
        cardIdsToRemove.forEach((id) => delete next[id]);
        return next;
      });

      setColumnCardMap((prev) => {
        const next = { ...prev };
        delete next[columnId];
        return next;
      });

      setColumnsById((prev) => {
        const boardId = prev[columnId]?.boardId;
        const next = { ...prev };
        delete next[columnId];

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