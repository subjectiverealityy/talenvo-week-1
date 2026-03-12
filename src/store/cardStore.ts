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
    (columnId: string, title: string, description = "", tags: string[] = [], dueDate: Date | null = null): void => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle || !columnsById[columnId]) return;

      const newId = crypto.randomUUID();
      const newCard: Card = {
        id: newId,
        title: trimmedTitle,
        columnId,
        description,
        tags,
        dueDate,
      };

      setCardsById((prev) => ({ ...prev, [newId]: newCard }));
      setColumnCardMap((prev) => ({
        ...prev,
        [columnId]: [...(prev[columnId] ?? []), newId],
      }));
    },
    [columnsById, setCardsById, setColumnCardMap]
  );

  const editCard = useCallback(
    (cardId: string, updates: Partial<Omit<Card, "id" | "columnId">>): void => {
      setCardsById((prev) => {
        if (!prev[cardId]) return prev;
        return { ...prev, [cardId]: { ...prev[cardId], ...updates } };
      });
    },
    [setCardsById]
  );

  const deleteCard = useCallback((cardId: string): void => {
    setCardsById((prev) => {
      const columnId = prev[cardId]?.columnId;
      const next = { ...prev };
      delete next[cardId];

      if (columnId) {
        setColumnCardMap((prevMap) => ({
          ...prevMap,
          [columnId]: prevMap[columnId].filter((id) => id !== cardId),
        }));
      }

      return next;
    });
  }, [setCardsById, setColumnCardMap]);

  return { createCard, editCard, deleteCard };
}