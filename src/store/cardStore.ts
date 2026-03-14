import { useCallback } from "react";
import type { Card, Column } from "@/types";

type Deps = {
  columnsById: Record<string, Column>;
  setCardsById: React.Dispatch<React.SetStateAction<Record<string, Card>>>;
  setColumnCardMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
};

export function useCardActions(deps: Deps) {
  const { columnsById, setCardsById, setColumnCardMap } = deps;

  const createCard = useCallback(
    (payload: {
      columnId: string;
      title: string;
      description?: string;
      tags?: string[];
      dueDate?: Date | null;
    }): void => {
      const trimmedTitle = payload.title.trim();
      if (!trimmedTitle || !columnsById[payload.columnId]) return;

      const newId = crypto.randomUUID();
      const newCard: Card = {
        id: newId,
        title: trimmedTitle,
        columnId: payload.columnId,
        description: payload.description ?? "",
        tags: payload.tags ?? [],
        dueDate: payload.dueDate ?? null,
      };

      setCardsById((prev) => ({ ...prev, [newId]: newCard }));
      setColumnCardMap((prev) => ({
        ...prev,
        [payload.columnId]: [...(prev[payload.columnId] ?? []), newId],
      }));
    },
    [columnsById, setCardsById, setColumnCardMap]
  );

  const editCard = useCallback(
    (payload: { cardId: string; updates: Partial<Omit<Card, "id" | "columnId">> }): void => {
      setCardsById((prev) => {
        if (!prev[payload.cardId]) return prev;
        return {
          ...prev,
          [payload.cardId]: { ...prev[payload.cardId], ...payload.updates },
        };
      });
    },
    [setCardsById]
  );

  const deleteCard = useCallback((payload: { cardId: string }): void => {
    setCardsById((prev) => {
      const columnId = prev[payload.cardId]?.columnId;
      const next = { ...prev };
      delete next[payload.cardId];

      if (columnId) {
        setColumnCardMap((prevMap) => ({
          ...prevMap,
          [columnId]: prevMap[columnId].filter((id) => id !== payload.cardId),
        }));
      }

      return next;
    });
  }, [setCardsById, setColumnCardMap]);

  return { createCard, editCard, deleteCard };
}
