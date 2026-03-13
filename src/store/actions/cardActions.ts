// Card Actions - pure functions that handle card state mutations.
// cardsById - full card objects keyed by id
// columnCardMap - all columns along with all the cards they contain
// refer to boardActions.ts for useful comments that carry over to this file.

import type { PersistedState } from "@/store/types";
import type { Card } from "@/types";

export function createCard(
  state: PersistedState,
  payload: {
    columnId: string;
    title: string;
    description?: string;
    tags?: string[];
    dueDate?: Date | null;
  }
): Partial<PersistedState> {
  const trimmedTitle = payload.title.trim();
  if (!trimmedTitle) return {};

  // Guard against adding a card to a column that does not exist
  if (!state.columnsById[payload.columnId]) return {};

  const newId = crypto.randomUUID();

  const createdCard: Card = {
    id: newId,
    title: trimmedTitle,
    columnId: payload.columnId,
    description: payload.description ?? "",
    tags: payload.tags ?? [],
    dueDate: payload.dueDate ?? null,
  };

  return {
    cardsById: { ...state.cardsById, [newId]: createdCard },
    columnCardMap: {
      ...state.columnCardMap,
      [payload.columnId]: [...(state.columnCardMap[payload.columnId] ?? []), newId],
    },
  };
}

export function editCard(
  state: PersistedState,
  payload: { cardId: string; updates: Partial<Omit<Card, "id" | "columnId">> }
): Partial<PersistedState> {
  // Guard against editing a card that does not exist
  if (!state.cardsById[payload.cardId]) return {};

  return {
    cardsById: {
      ...state.cardsById,
      [payload.cardId]: {
        ...state.cardsById[payload.cardId],
        ...payload.updates,
      },
    },
  };
}

export function deleteCard(
  state: PersistedState,
  payload: { cardId: string }
): Partial<PersistedState> {
  const card = state.cardsById[payload.cardId];

  // Guard against deleting a card that does not exist
  if (!card) return {};

  const cardsById = { ...state.cardsById };
  delete cardsById[payload.cardId];

  const columnCardMap = { ...state.columnCardMap };
  columnCardMap[card.columnId] = columnCardMap[card.columnId].filter(
    (id) => id !== payload.cardId
  );

  return {
    cardsById,
    columnCardMap,
  };
}

// The moveCard function handles both reordering within a column and moving across columns. It removes the card from the source column, inserts it at the target index in the destination column, and updates the card's columnId if it moved to a different column.
export function moveCard(
  state: PersistedState,
  payload: {
    cardId: string;
    sourceColumnId: string;
    destinationColumnId: string;
    newIndex: number;
  }
): Partial<PersistedState> {
  // Guard against moving a card that does not exist
  if (!state.cardsById[payload.cardId]) return {};

  // Guard against invalid column ids
  if (!state.columnCardMap[payload.sourceColumnId]) return {};
  if (!state.columnCardMap[payload.destinationColumnId]) return {};

  // Remove card from source column
  const sourceColumnCards = state.columnCardMap[payload.sourceColumnId].filter(
    (id) => id !== payload.cardId
  );

  // Insert card at target index in destination column
  const destinationColumnCards = [...state.columnCardMap[payload.destinationColumnId]];
  destinationColumnCards.splice(payload.newIndex, 0, payload.cardId);

  const columnCardMap = {
    ...state.columnCardMap,
    [payload.sourceColumnId]: sourceColumnCards,
    [payload.destinationColumnId]: destinationColumnCards,
  };

  // Update columnId on the card only if it moved to a different column
  const cardsById =
    payload.sourceColumnId !== payload.destinationColumnId
      ? {
          ...state.cardsById,
          [payload.cardId]: {
            ...state.cardsById[payload.cardId],
            columnId: payload.destinationColumnId,
          },
        }
      : state.cardsById;

  return {
    columnCardMap,
    cardsById,
  };
}