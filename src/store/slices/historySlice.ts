// History Slice - manages undo/redo for card actions (create, delete, move).
// Uses a minimal action history with inverse operations instead of full-state snapshots.

import type { PersistedState } from "@/store/types";
import type { Card } from "@/types";
import { deleteCard, moveCard } from "@/store/actions/cardActions";

const MAX_HISTORY = 50;

export type HistoryAction =
  | {
      type: "CREATE_CARD";
      payload: { card: Card; columnId: string; index: number };
    }
  | {
      type: "DELETE_CARD";
      payload: { card: Card; columnId: string; index: number };
    }
  | {
      type: "MOVE_CARD";
      payload: {
        cardId: string;
        fromColumnId: string;
        toColumnId: string;
        fromIndex: number;
        toIndex: number;
      };
    };

export type HistoryState = {
  past: HistoryAction[];
  future: HistoryAction[];
};

export function createHistorySlice(
  set: (
    partial: Partial<PersistedState & HistoryState>,
    replace?: boolean,
    action?: string
  ) => void,
  get: () => PersistedState & HistoryState
) {
  return {
    past: [] as HistoryAction[],
    future: [] as HistoryAction[],

    pushHistory: (action: HistoryAction) => {
      const { past } = get();
      const trimmed = past.length >= MAX_HISTORY ? past.slice(1) : past;
      set(
        { past: [...trimmed, action], future: [] },
        false,
        `history/pushHistory/${action.type}`
      );
    },

    undo: () => {
      const { past, future } = get();
      if (past.length === 0) return;
      const action = past[past.length - 1];
      const updates = applyInverseHistoryAction(get(), action);
      set(
        {
          ...updates,
          past: past.slice(0, -1),
          future: [action, ...future],
        },
        false,
        `history/undo/${action.type}`
      );
    },

    redo: () => {
      const { past, future } = get();
      if (future.length === 0) return;
      const action = future[0];
      const updates = applyHistoryAction(get(), action);
      set(
        {
          ...updates,
          past: [...past, action],
          future: future.slice(1),
        },
        false,
        `history/redo/${action.type}`
      );
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  };
}

export type HistorySlice = ReturnType<typeof createHistorySlice>;

function applyHistoryAction(
  state: PersistedState,
  action: HistoryAction
): Partial<PersistedState> {
  switch (action.type) {
    case "CREATE_CARD":
      return insertCard(state, action.payload.card, action.payload.columnId, action.payload.index);
    case "DELETE_CARD":
      return deleteCard(state, { cardId: action.payload.card.id });
    case "MOVE_CARD": {
      const destinationCards = state.columnCardMap[action.payload.toColumnId] ?? [];
      const safeIndex = clampIndex(action.payload.toIndex, destinationCards.length);
      return moveCard(state, {
        cardId: action.payload.cardId,
        sourceColumnId: action.payload.fromColumnId,
        destinationColumnId: action.payload.toColumnId,
        newIndex: safeIndex,
      });
    }
    default: {
      const _exhaustive: never = action;
      return {};
    }
  }
}

function applyInverseHistoryAction(
  state: PersistedState,
  action: HistoryAction
): Partial<PersistedState> {
  switch (action.type) {
    case "CREATE_CARD":
      return deleteCard(state, { cardId: action.payload.card.id });
    case "DELETE_CARD":
      return insertCard(state, action.payload.card, action.payload.columnId, action.payload.index);
    case "MOVE_CARD": {
      const destinationCards = state.columnCardMap[action.payload.fromColumnId] ?? [];
      const safeIndex = clampIndex(action.payload.fromIndex, destinationCards.length);
      return moveCard(state, {
        cardId: action.payload.cardId,
        sourceColumnId: action.payload.toColumnId,
        destinationColumnId: action.payload.fromColumnId,
        newIndex: safeIndex,
      });
    }
    default: {
      const _exhaustive: never = action;
      return {};
    }
  }
}

function clampIndex(index: number, length: number): number {
  if (index < 0) return 0;
  if (index > length) return length;
  return index;
}

function insertCard(
  state: PersistedState,
  card: Card,
  columnId: string,
  index: number
): Partial<PersistedState> {
  if (!state.columnsById[columnId]) return {};
  if (state.cardsById[card.id]) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`insertCard: card ${card.id} already exists in state`);
    }
    return {};
  }

  const cardsById = { ...state.cardsById, [card.id]: card };
  const current = state.columnCardMap[columnId] ?? [];
  const next = [...current];
  const safeIndex = clampIndex(index, next.length);
  next.splice(safeIndex, 0, card.id);

  return {
    cardsById,
    columnCardMap: {
      ...state.columnCardMap,
      [columnId]: next,
    },
  };
}