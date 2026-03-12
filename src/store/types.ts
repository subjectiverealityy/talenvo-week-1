// Store Types file - defines the core types for the application's state management. It imports domain-specific types and uses them to create store-specific types.

// In essence, it imports the core Domain Types (Board, Column, Card), and references them to define the shape of the persisted state and the context value provided by the store.

// VisualState holds ephemeral UI-related state. 

// PersistedState defines the normalized state for boards, columns, and cards, as well as the maps that store the order of entities that belong to parent entities i.e. "column1": ["card1", "card2"]. It was given the name "PersistedState" because its data will be persisted after browser refreshes, unlike VisualState's data.

// ContextValue defines the shape of the value provided by the store context. It is the 'store API' that components will use. It includes the current state slices (boardsById, boardIds, columnsById, etc.), mutation functions (createBoard, editBoard, deleteBoard, etc.), and defines a contract that says 'any component consuming the store must expect exactly these properties/functions'.

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

export type ContextValue = {
  boardsById: Record<string, Board>;
  boardIds: string[];
  createBoard: (title: string, description?: string) => void;
  editBoard: (boardId: string, updates: Partial<Pick<Board, "title" | "description">>) => void;
  deleteBoard: (boardId: string) => void;

  columnsById: Record<string, Column>;
  createColumn: (boardId: string, title: string) => void;
  editColumn: (columnId: string, title: string) => void;
  deleteColumn: (columnId: string) => void;

  cardsById: Record<string, Card>;
  createCard: (columnId: string, title: string, description?: string, tags?: string[], dueDate?: Date | null) => void;
  editCard: (cardId: string, updates: Partial<Omit<Card, "id" | "columnId">>) => void;
  deleteCard: (cardId: string) => void;

  boardColumnMap: Record<string, string[]>;
  columnCardMap: Record<string, string[]>;

  visualState: VisualState;
  setActiveCardId: (id: string | null) => void;
};