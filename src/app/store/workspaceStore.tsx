"use client";

import { createContext, useContext, useState, ReactNode, JSX } from "react";

// Board type
type Board = {
  id: string;
  title: string;
  description: string;
  dateCreated: Date;
};

type Column = {
  id: string;
  title: string;
  boardId: string;
};

type Card = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  dueDate: Date | null;
  columnId: string;
};

// Context type
type WorkspaceContextType = {
  boardsById: Record<string, Board>;
  boardIds: string[];
  createBoard: (title: string, description?: string) => void;

  columnsById: Record<string, Column>;
  columnIds: string[];
  createColumn: (boardId: string, title: string) => void;

  cardsById: Record<string, Card>;
  cardIds: string[];
  createCard: (
    columnId: string,
    title: string,
    description?: string,
    tags?: string[],
    dueDate?: Date | null
  ) => void;

  boardColumnMap: Record<string, string[]>;
  columnCardMap: Record<string, string[]>;
};

// Workspace context
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Workspace provider
type WorkspaceProviderProps = { children: ReactNode };

export const WorkspaceProvider = ({
  children,
}: WorkspaceProviderProps): JSX.Element => {
  const [boardsById, setBoardsById] = useState<Record<string, Board>>({});
  const [boardIds, setBoardIds] = useState<string[]>([]);

  const [columnsById, setColumnsById] = useState<Record<string, Column>>({});
  const [columnIds, setColumnIds] = useState<string[]>([]);
  const [boardColumnMap, setBoardColumnMap] = useState<Record<string, string[]>>(
    {}
  );

  const [cardsById, setCardsById] = useState<Record<string, Card>>({});
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [columnCardMap, setColumnCardMap] = useState<Record<string, string[]>>(
    {}
  );

  const createBoard = (title: string, description: string = ""): void => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const newId = crypto.randomUUID();

    const newBoard: Board = {
      id: newId,
      title: trimmedTitle,
      description,
      dateCreated: new Date(),
    };

    setBoardsById((prev) => ({
      ...prev,
      [newId]: newBoard,
    }));

    setBoardIds((prev) => [...prev, newId]);

    setBoardColumnMap((prev) => ({
      ...prev,
      [newId]: [],
    }));
  };

  const createColumn = (boardId: string, title: string): void => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    if (!boardsById[boardId]) return;

    const newId = crypto.randomUUID();

    const newColumn: Column = {
      id: newId,
      title: trimmedTitle,
      boardId,
    };

    setColumnsById((prev) => ({
      ...prev,
      [newId]: newColumn,
    }));

    setColumnIds((prev) => [...prev, newId]);

    setBoardColumnMap((prev) => ({
      ...prev,
      [boardId]: [...prev[boardId], newId],
    }));

    setColumnCardMap((prev) => ({
      ...prev,
      [newId]: [],
    }));
  };

  const createCard = (
    columnId: string,
    title: string,
    description = "",
    tags: string[] = [],
    dueDate: Date | null = null
  ): void => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    if (!columnsById[columnId]) return;

    const newId = crypto.randomUUID();

    const newCard: Card = {
      id: newId,
      title: trimmedTitle,
      columnId,
      description,
      tags,
      dueDate,
    };

    setCardsById((prev) => ({
      ...prev,
      [newId]: newCard,
    }));

    setCardIds((prev) => [...prev, newId]);

    setColumnCardMap((prev) => ({
      ...prev,
      [columnId]: [...prev[columnId], newId],
    }));
  };

  return (
    <WorkspaceContext.Provider
      value={{
        boardsById,
        boardIds,
        createBoard,
        columnsById,
        columnIds,
        createColumn,
        cardsById,
        cardIds,
        createCard,
        columnCardMap,
        boardColumnMap,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspaceContext = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error(
      "useWorkspaceContext must be used within a WorkspaceProvider"
    );
  }
  return context;
};