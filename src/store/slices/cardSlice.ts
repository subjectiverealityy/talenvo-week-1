// Card Slice - connects the pure card action functions to Zustand.
// This is a wiring layer that routes Zustand's 'set' and 'get' to the pure action functions in cardActions.ts.
// createCardSlice returns an object with four methods: createCard, editCard, deleteCard, moveCard.
// refer to boardSlice.ts for useful comments that carry over to this file.

import type { PersistedState } from "@/store/types";
import type { Card } from "@/types";
import type { HistoryAction, HistorySlice } from "@/store/slices/historySlice";
import { createCard, editCard, deleteCard, moveCard } from "@/store/actions/cardActions";

export function createCardSlice(
  set: (partial: Partial<PersistedState & HistorySlice>) => void,
  get: () => PersistedState & HistorySlice
) {
  return {
    createCard: (payload: {
      id?: string;
      columnId: string;
      title: string;
      description?: string;
      tags?: string[];
      dueDate?: Date | null;
    }) => {
      const updates = createCard(get(), payload);
      if (isEmpty(updates)) return;
      set(updates);
      const nextState = get();
      const columnCards = nextState.columnCardMap[payload.columnId] ?? [];
      const newCardId = columnCards[columnCards.length - 1];
      const createdCard = newCardId ? nextState.cardsById[newCardId] : null;
      if (!createdCard) return;
      const action: HistoryAction = {
        type: "CREATE_CARD",
        payload: {
          card: createdCard,
          columnId: payload.columnId,
          index: Math.max(0, columnCards.length - 1),
        },
      };
      nextState.pushHistory(action);
    },

    editCard: (payload: {
      cardId: string;
      updates: Partial<Omit<Card, "id" | "columnId">>;
    }) => set(editCard(get(), payload)),

    deleteCard: (payload: { cardId: string }) => {
      const state = get();
      const card = state.cardsById[payload.cardId];
      if (!card) return;
      const columnCards = state.columnCardMap[card.columnId] ?? [];
      const index = columnCards.indexOf(card.id);
      const safeIndex = index === -1 ? columnCards.length : index;
      const updates = deleteCard(state, payload);
      if (isEmpty(updates)) return;
      set(updates);
      const action: HistoryAction = {
        type: "DELETE_CARD",
        payload: {
          card,
          columnId: card.columnId,
          index: safeIndex,
        },
      };
      state.pushHistory(action);
    },

    moveCard: (payload: {
      cardId: string;
      sourceColumnId: string;
      destinationColumnId: string;
      newIndex: number;
    }) => {
      const state = get();
      const fromColumnCards = state.columnCardMap[payload.sourceColumnId] ?? [];
      const fromIndex = fromColumnCards.indexOf(payload.cardId);
      const updates = moveCard(state, payload);
      if (isEmpty(updates)) return;
      set(updates);
      const action: HistoryAction = {
        type: "MOVE_CARD",
        payload: {
          cardId: payload.cardId,
          fromColumnId: payload.sourceColumnId,
          toColumnId: payload.destinationColumnId,
          fromIndex: fromIndex === -1 ? 0 : fromIndex,
          toIndex: payload.newIndex,
        },
      };
      state.pushHistory(action);
    },
  };
}

function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

export type CardSlice = ReturnType<typeof createCardSlice>;
