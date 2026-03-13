// Card Slice - connects the pure card action functions to Zustand.
// This is a wiring layer that routes Zustand's 'set' and 'get' to the pure action functions in cardActions.ts.
// createCardSlice returns an object with four methods: createCard, editCard, deleteCard, moveCard.
// refer to boardSlice.ts for useful comments that carry over to this file.

import type { PersistedState } from "@/store/types";
import type { Card } from "@/types";
import { createCard, editCard, deleteCard, moveCard } from "@/store/actions/cardActions";

export function createCardSlice(
  set: (partial: Partial<PersistedState>) => void,
  get: () => PersistedState
) {
  return {
    createCard: (payload: {
      columnId: string;
      title: string;
      description?: string;
      tags?: string[];
      dueDate?: Date | null;
    }) => set(createCard(get(), payload)),

    editCard: (payload: {
      cardId: string;
      updates: Partial<Omit<Card, "id" | "columnId">>;
    }) => set(editCard(get(), payload)),

    deleteCard: (payload: { cardId: string }) =>
      set(deleteCard(get(), payload)),

    moveCard: (payload: {
      cardId: string;
      sourceColumnId: string;
      destinationColumnId: string;
      newIndex: number;
    }) => set(moveCard(get(), payload)),
  };
}