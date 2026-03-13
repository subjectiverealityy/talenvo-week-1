// Store Types file - defines the core types for the application's state management. It imports domain-specific types and uses them to create store-specific types.

// VisualState holds ephemeral UI-related state. 

// PersistedState defines the normalized state for boards, columns, and cards, as well as the maps that store the order of entities that belong to parent entities i.e. "column1": ["card1", "card2"]. It was given the name "PersistedState" because its data will be persisted after browser refreshes, unlike VisualState's data.

// boardColumnMap: maps all board IDs to the ordered array of column IDs that they contain
// columnCardMap: maps all column IDs to the ordered array of card IDs that they contain

import type { Board, Column, Card } from "@/types";

export type VisualState = {
  activeCardId: string | null;
};

export type PersistedState = {
  boardsById: Record<string, Board>;
  boardIds: string[];
  columnsById: Record<string, Column>;
  boardColumnMap: Record<string, string[]>;
  cardsById: Record<string, Card>;
  columnCardMap: Record<string, string[]>;
};

// Action defines every possible state mutation in the app as a discriminated union. Each action has a type (what happened) and a payload (the data needed to apply it). UNDO and REDO have no payload - they operate on the history log.
export type Action =
  | { type: "CREATE_BOARD"; payload: { title: string; description: string } }
  | { type: "DELETE_BOARD"; payload: { boardId: string } }
  | { type: "EDIT_BOARD"; payload: { boardId: string; updates: Partial<Pick<Board, "title" | "description">> } }
  | { type: "CREATE_COLUMN"; payload: { boardId: string; title: string } }
  | { type: "DELETE_COLUMN"; payload: { columnId: string } }
  | { type: "EDIT_COLUMN"; payload: { columnId: string; title: string } }
  | { type: "CREATE_CARD"; payload: { columnId: string; title: string; description?: string; tags?: string[]; dueDate?: Date | null } }
  | { type: "EDIT_CARD"; payload: { cardId: string; updates: Partial<Omit<Card, "id" | "columnId">> } }
  | { type: "DELETE_CARD"; payload: { cardId: string } }
  | { type: "MOVE_CARD"; payload: { cardId: string; sourceColumnId: string; destinationColumnId: string; newIndex: number } }
  | { type: "UNDO" }
  | { type: "REDO" };