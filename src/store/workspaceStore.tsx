"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  JSX,
} from "react";

// Board type
export type Board = {
  id: string;
  title: string;
  description: string;
  dateCreated: Date;
};

export type Column = {
  id: string;
  title: string;
  boardId: string;
};

export type Card = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  dueDate: Date | null;
  columnId: string;
};

type VisualState = {
  activeBoardId: string | null;
  activeCardId: string | null;
};

// Context type
type WorkspaceContextType = {
  boardsById: Record<string, Board>;
  boardIds: string[];
  createBoard: (title: string, description?: string) => void;
  deleteBoard: (boardId: string) => void;

  columnsById: Record<string, Column>;
  columnIds: string[];
  createColumn: (boardId: string, title: string) => void;
  editColumn: (columnId: string, title: string) => void;
  deleteColumn: (columnId: string) => void;

  cardsById: Record<string, Card>;
  cardIds: string[];
  createCard: (
    columnId: string,
    title: string,
    description?: string,
    tags?: string[],
    dueDate?: Date | null
  ) => void;
  editCard: (
    cardId: string,
    updates: Partial<Omit<Card, "id" | "columnId">>
  ) => void;
  deleteCard: (cardId: string) => void;

  boardColumnMap: Record<string, string[]>;
  columnCardMap: Record<string, string[]>;

  visualState: VisualState;
  setActiveBoardId: (id: string | null) => void;
  setActiveCardId: (id: string | null) => void;
};

// Workspace context
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

// Workspace provider
type WorkspaceProviderProps = { children: ReactNode };

export const WorkspaceProvider = ({
  children,
}: WorkspaceProviderProps): JSX.Element => {
  const [boardsById, setBoardsById] = useState<Record<string, Board>>({});
  const [boardIds, setBoardIds] = useState<string[]>([]);

  const [columnsById, setColumnsById] = useState<Record<string, Column>>({});
  const [columnIds, setColumnIds] = useState<string[]>([]);
  const [boardColumnMap, setBoardColumnMap] = useState<
    Record<string, string[]>
  >({});

  const [cardsById, setCardsById] = useState<Record<string, Card>>({});
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [columnCardMap, setColumnCardMap] = useState<Record<string, string[]>>(
    {}
  );

  const [visualState, setVisualState] = useState<VisualState>({
    activeBoardId: null,
    activeCardId: null,
  });

  const setActiveBoardId = useCallback((id: string | null) => {
    setVisualState((prev) => ({ ...prev, activeBoardId: id }));
  }, []);

  const setActiveCardId = useCallback((id: string | null) => {
    setVisualState((prev) => ({ ...prev, activeCardId: id }));
  }, []);

  const createBoard = useCallback(
    (title: string, description: string = ""): void => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      const newId = crypto.randomUUID();

      const newBoard: Board = {
        id: newId,
        title: trimmedTitle,
        description: description.trim(),
        dateCreated: new Date(),
      };

      setBoardsById((prev) => ({ ...prev, [newId]: newBoard }));
      setBoardIds((prev) => [...prev, newId]);
      setBoardColumnMap((prev) => ({ ...prev, [newId]: [] }));
    },
    []
  );

  const deleteBoard = useCallback(
    (boardId: string): void => {
      const colIds = boardColumnMap[boardId] ?? [];
      const cardIdsToRemove = colIds.flatMap((cId) => columnCardMap[cId] ?? []);

      setCardsById((prev) => {
        const next = { ...prev };
        cardIdsToRemove.forEach((id) => delete next[id]);
        return next;
      });
      setCardIds((prev) => prev.filter((id) => !cardIdsToRemove.includes(id)));

      setColumnCardMap((prev) => {
        const next = { ...prev };
        colIds.forEach((id) => delete next[id]);
        return next;
      });

      setColumnsById((prev) => {
        const next = { ...prev };
        colIds.forEach((id) => delete next[id]);
        return next;
      });
      setColumnIds((prev) => prev.filter((id) => !colIds.includes(id)));

      setBoardColumnMap((prev) => {
        const next = { ...prev };
        delete next[boardId];
        return next;
      });

      setBoardsById((prev) => {
        const next = { ...prev };
        delete next[boardId];
        return next;
      });
      setBoardIds((prev) => prev.filter((id) => id !== boardId));
    },
    [boardColumnMap, columnCardMap]
  );

  const createColumn = useCallback((boardId: string, title: string): void => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    if (!boardsById[boardId]) return;

    const newId = crypto.randomUUID();

    const newColumn: Column = {
      id: newId,
      title: trimmedTitle,
      boardId,
    };

    setColumnsById((prev) => ({ ...prev, [newId]: newColumn }));
    setColumnIds((prev) => [...prev, newId]);
    setBoardColumnMap((prev) => ({
      ...prev,
      [boardId]: [...(prev[boardId] ?? []), newId],
    }));
    setColumnCardMap((prev) => ({ ...prev, [newId]: [] }));
  }, [boardsById]);

  const editColumn = useCallback(
    (columnId: string, title: string): void => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      setColumnsById((prev) => {
        if (!prev[columnId]) return prev;
        return {
          ...prev,
          [columnId]: { ...prev[columnId], title: trimmedTitle },
        };
      });
    },
    []
  );

  const deleteColumn = useCallback(
    (columnId: string): void => {
      const cardIdsToRemove = columnCardMap[columnId] ?? [];

      setCardsById((prev) => {
        const next = { ...prev };
        cardIdsToRemove.forEach((id) => delete next[id]);
        return next;
      });
      setCardIds((prev) => prev.filter((id) => !cardIdsToRemove.includes(id)));

      setColumnCardMap((prev) => {
        const next = { ...prev };
        delete next[columnId];
        return next;
      });

      setColumnsById((prev) => {
        const boardId = prev[columnId]?.boardId;
        const next = { ...prev };
        delete next[columnId];

        if (boardId) {
          setBoardColumnMap((prevMap) => ({
            ...prevMap,
            [boardId]: prevMap[boardId].filter((id) => id !== columnId),
          }));
        }

        return next;
      });

      setColumnIds((prev) => prev.filter((id) => id !== columnId));
    },
    [columnCardMap]
  );

  const createCard = useCallback(
    (
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

      setCardsById((prev) => ({ ...prev, [newId]: newCard }));
      setCardIds((prev) => [...prev, newId]);
      setColumnCardMap((prev) => ({
        ...prev,
        [columnId]: [...(prev[columnId] ?? []), newId],
      }));
    },
    [columnsById]
  );

  const editCard = useCallback(
    (
      cardId: string,
      updates: Partial<Omit<Card, "id" | "columnId">>
    ): void => {
      setCardsById((prev) => {
        if (!prev[cardId]) return prev;
        return { ...prev, [cardId]: { ...prev[cardId], ...updates } };
      });
    },
    []
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

    setCardIds((prev) => prev.filter((id) => id !== cardId));
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        boardsById,
        boardIds,
        createBoard,
        deleteBoard,
        columnsById,
        columnIds,
        createColumn,
        editColumn,
        deleteColumn,
        cardsById,
        cardIds,
        createCard,
        editCard,
        deleteCard,
        columnCardMap,
        boardColumnMap,
        visualState,
        setActiveBoardId,
        setActiveCardId,
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