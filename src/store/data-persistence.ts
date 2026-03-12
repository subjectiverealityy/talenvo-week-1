// Persistence Layer - responsible for ensuring that persistent data survives refreshes.

// Everything related to saving and restoring state lives here. This is the file to update if you ever want to swap localStorage for IndexedDB, a backend API, or any other storage mechanism.

// If you add new Date fields, you will need to import the types and update the reviveDates function.

import type { PersistedState } from "@/store/types";
import type { Board, Card } from "@/types";

// Versioned key — change to "app_v2" if PersistedState shape changes to avoid silent data corruption from stale stored data.
const STORAGE_KEY = "app_v1";

// This object is used in store.tsx to initialize useState. It needs to follow the shape of PersistedState, and should be updated if you add new fields to PersistedState.
export const defaultState: PersistedState = {
  boardsById: {},
  boardIds: [],
  columnsById: {},
  boardColumnMap: {},
  cardsById: {},
  columnCardMap: {},
};

// When a Date object is saved to localStorage, it is converted into a string. When loaded from localStorage (deserialized), it is converted back into a Date object using the reviveDates function.
function reviveDates(state: PersistedState): PersistedState {
  const boardsById = Object.fromEntries(
    Object.entries(state.boardsById).map(([id, board]: [string, Board]) => [
      id,
      { ...board, dateCreated: new Date(board.dateCreated) },
    ])
  );

  const cardsById = Object.fromEntries(
    Object.entries(state.cardsById).map(([id, card]: [string, Card]) => [
      id,
      { ...card, dueDate: card.dueDate ? new Date(card.dueDate) : null },
    ])
  );

  return { ...state, boardsById, cardsById };
}

export function loadFromStorage(): PersistedState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    return reviveDates(JSON.parse(json));
  } catch {
    return null;
  }
}

export function saveToStorage(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage quota exceeded
  }
}