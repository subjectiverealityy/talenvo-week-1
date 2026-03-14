// This file exports useBoardActions() - a custom hook that provides functions to create, edit, and delete boards. The functions returned by this hook are used in the UI components to trigger board-related actions.
// The hook also ensures that when a board is deleted, all associated columns and cards are also removed from the state.

import { useCallback } from "react";
import type { Board } from "@/types";

type SetBoardsById = React.Dispatch<React.SetStateAction<Record<string, Board>>>;
type SetBoardIds = React.Dispatch<React.SetStateAction<string[]>>;
type SetBoardColumnMap = React.Dispatch<React.SetStateAction<Record<string, string[]>>>;

type Deps = {
  boardColumnMap: Record<string, string[]>;
  columnCardMap: Record<string, string[]>;
  setBoardsById: SetBoardsById;
  setBoardIds: SetBoardIds;
  setBoardColumnMap: SetBoardColumnMap;
  setColumnsById: React.Dispatch<React.SetStateAction<Record<string, import("@/types").Column>>>;
  setCardsById: React.Dispatch<React.SetStateAction<Record<string, import("@/types").Card>>>;
  setColumnCardMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
};

export function useBoardActions(deps: Deps) {
  const {
    boardColumnMap,
    columnCardMap,
    setBoardsById,
    setBoardIds,
    setBoardColumnMap,
    setColumnsById,
    setCardsById,
    setColumnCardMap,
  } = deps;

  const createBoard = useCallback(
    (payload: { title: string; description: string }): void => {
      const trimmedTitle = payload.title.trim();
      if (!trimmedTitle) return;

      const newId = crypto.randomUUID();
      const newBoard: Board = {
        id: newId,
        title: trimmedTitle,
        description: payload.description.trim(),
        dateCreated: new Date(),
      };

      setBoardsById((prev) => ({ ...prev, [newId]: newBoard }));
      setBoardIds((prev) => [...prev, newId]);
      setBoardColumnMap((prev) => ({ ...prev, [newId]: [] }));
    },
    [setBoardsById, setBoardIds, setBoardColumnMap]
  );

  const editBoard = useCallback(
    (payload: { boardId: string; updates: Partial<Pick<Board, "title" | "description">> }): void => {
      setBoardsById((prev) => {
        if (!prev[payload.boardId]) return prev;
        return {
          ...prev,
          [payload.boardId]: { ...prev[payload.boardId], ...payload.updates },
        };
      });
    },
    [setBoardsById]
  );

  const deleteBoard = useCallback(
    (payload: { boardId: string }): void => {
      const colIds = boardColumnMap[payload.boardId] ?? [];
      const cardIdsToRemove = colIds.flatMap((cId) => columnCardMap[cId] ?? []);

      setCardsById((prev) => {
        const next = { ...prev };
        cardIdsToRemove.forEach((id) => delete next[id]);
        return next;
      });

      setColumnCardMap((prev) => {
        const next = { ...prev };
        colIds.forEach((id) => delete next[id]);
        return next;
      });

      setColumnsById((prev) => {
        const next = { ...prev };
        colIds.forEach((id) => delete next[id]);
        return next;
      });

      setBoardColumnMap((prev) => {
        const next = { ...prev };
        delete next[payload.boardId];
        return next;
      });

      setBoardsById((prev) => {
        const next = { ...prev };
        delete next[payload.boardId];
        return next;
      });

      setBoardIds((prev) => prev.filter((id) => id !== payload.boardId));
    },
    [boardColumnMap, columnCardMap, setBoardsById, setBoardIds, setBoardColumnMap, setColumnsById, setCardsById, setColumnCardMap]
  );

  return { createBoard, editBoard, deleteBoard };
}
