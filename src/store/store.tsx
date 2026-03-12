"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  JSX,
} from "react";

import type { Board, Column, Card } from "@/types";
import type { VisualState } from "@/store/types";
import { defaultState, loadFromStorage, saveToStorage } from "@/store/data-persistence";
import { useBoardActions } from "@/store/boardStore";
import { useColumnActions } from "@/store/columnStore";
import { useCardActions } from "@/store/cardStore";

const storeContext = createContext<ContextValue | undefined>(undefined);

export const StoreProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [boardsById, setBoardsById] = useState<Record<string, Board>>(defaultState.boardsById);
  const [boardIds, setBoardIds] = useState<string[]>(defaultState.boardIds);
  const [columnsById, setColumnsById] = useState<Record<string, Column>>(defaultState.columnsById);
  const [boardColumnMap, setBoardColumnMap] = useState<Record<string, string[]>>(defaultState.boardColumnMap);
  const [cardsById, setCardsById] = useState<Record<string, Card>>(defaultState.cardsById);
  const [columnCardMap, setColumnCardMap] = useState<Record<string, string[]>>(defaultState.columnCardMap);

  const [visualState, setVisualState] = useState<VisualState>({
    activeCardId: null
  });

  useEffect(() => {
    const saved = loadFromStorage();
    if (!saved) return;
    setBoardsById(saved.boardsById);
    setBoardIds(saved.boardIds);
    setColumnsById(saved.columnsById);
    setBoardColumnMap(saved.boardColumnMap);
    setCardsById(saved.cardsById);
    setColumnCardMap(saved.columnCardMap);
  }, []);

  useEffect(() => {
    saveToStorage({ boardsById, boardIds, columnsById, boardColumnMap, cardsById, columnCardMap });
  }, [boardsById, boardIds, columnsById, boardColumnMap, cardsById, columnCardMap]);

  const setActiveCardId = useCallback((id: string | null) => {
    setVisualState((prev) => ({ ...prev, activeCardId: id }));
  }, []);

  const { createBoard, editBoard, deleteBoard } = useBoardActions({
    boardColumnMap,
    columnCardMap,
    setBoardsById,
    setBoardIds,
    setBoardColumnMap,
    setColumnsById,
    setCardsById,
    setColumnCardMap,
  });

  const { createColumn, editColumn, deleteColumn } = useColumnActions({
    boardsById,
    columnCardMap,
    setColumnsById,
    setBoardColumnMap,
    setCardsById,
    setColumnCardMap,
  });

  const { createCard, editCard, deleteCard } = useCardActions({
    columnsById,
    setCardsById,
    setColumnCardMap,
  });

  return (
    <storeContext.Provider
      value={{
        boardsById, boardIds, createBoard, editBoard, deleteBoard,
        columnsById, createColumn, editColumn, deleteColumn,
        cardsById, createCard, editCard, deleteCard,
        columnCardMap, boardColumnMap,
        visualState, setActiveCardId,
      }}
    >
      {children}
    </storeContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(storeContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};

// "use client";

// import {
//   createContext,
//   useContext,
//   useState,
//   useCallback,
//   useEffect,
//   ReactNode,
//   JSX,
// } from "react";

// // Board type
// export type Board = {
//   id: string;
//   title: string;
//   description: string;
//   dateCreated: Date;
// };

// export type Column = {
//   id: string;
//   title: string;
//   boardId: string;
// };

// export type Card = {
//   id: string;
//   title: string;
//   description: string;
//   tags: string[];
//   dueDate: Date | null;
//   columnId: string;
// };

// type VisualState = {
//   activeCardId: string | null;
// };

// type PersistedState = {
//   boardsById: Record<string, Board>;
//   boardIds: string[];
//   columnsById: Record<string, Column>;
//   boardColumnMap: Record<string, string[]>;
//   cardsById: Record<string, Card>;
//   columnCardMap: Record<string, string[]>;
// };

// // Context type
// type ContextValue = { // previously WorkspaceContextType
//   boardsById: Record<string, Board>;
//   boardIds: string[];
//   createBoard: (title: string, description?: string) => void;
//   editBoard: (boardId: string, updates: Partial<Pick<Board, "title" | "description">>) => void;
//   deleteBoard: (boardId: string) => void;

//   columnsById: Record<string, Column>;
//   createColumn: (boardId: string, title: string) => void;
//   editColumn: (columnId: string, title: string) => void;
//   deleteColumn: (columnId: string) => void;

//   cardsById: Record<string, Card>;
//   createCard: (
//     columnId: string,
//     title: string,
//     description?: string,
//     tags?: string[],
//     dueDate?: Date | null
//   ) => void;
//   editCard: (
//     cardId: string,
//     updates: Partial<Omit<Card, "id" | "columnId">>
//   ) => void;
//   deleteCard: (cardId: string) => void;

//   boardColumnMap: Record<string, string[]>;
//   columnCardMap: Record<string, string[]>;

//   visualState: VisualState;
//   setActiveCardId: (id: string | null) => void;
// };

// // localStorage helpers

// const STORAGE_KEY = "workspace";

// function restoreDates(state: PersistedState): PersistedState {
//   const boardsById = Object.fromEntries(
//     Object.entries(state.boardsById).map(([id, board]) => [
//       id,
//       { ...board, dateCreated: new Date(board.dateCreated) },
//     ])
//   );

//   const cardsById = Object.fromEntries(
//     Object.entries(state.cardsById).map(([id, card]) => [
//       id,
//       { ...card, dueDate: card.dueDate ? new Date(card.dueDate) : null },
//     ])
//   );

//   return { ...state, boardsById, cardsById };
// }

// function loadFromStorage(): PersistedState | null {
//   try {
//     const raw = localStorage.getItem(STORAGE_KEY);
//     if (!raw) return null;
//     return restoreDates(JSON.parse(raw));
//   } catch {
//     return null;
//   }
// }

// function saveToStorage(state: PersistedState): void {
//   try {
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
//   } catch {
//     // storage exceeded
//   }
// }

// const defaultState: PersistedState = {
//   boardsById: {},
//   boardIds: [],
//   columnsById: {},
//   boardColumnMap: {},
//   cardsById: {},
//   columnCardMap: {},
// };

// // Workspace context
// const storeContext = createContext<ContextValue | undefined>( // previousely WorkspaceContext
//   undefined
// );

// // Workspace provider
// type ProviderProps = { children: ReactNode }; // previously WorkspaceProviderProps 

// export const StoreProvider = ({ // previously WorkspaceProvider
//   children,
// }: ProviderProps): JSX.Element => { // previously WorkspaceProvider
//   const [boardsById, setBoardsById] = useState<Record<string, Board>>(defaultState.boardsById);
//   const [boardIds, setBoardIds] = useState<string[]>(defaultState.boardIds);
//   const [columnsById, setColumnsById] = useState<Record<string, Column>>(defaultState.columnsById);
//   const [boardColumnMap, setBoardColumnMap] = useState<Record<string, string[]>>(defaultState.boardColumnMap);
//   const [cardsById, setCardsById] = useState<Record<string, Card>>(defaultState.cardsById);
//   const [columnCardMap, setColumnCardMap] = useState<Record<string, string[]>>(defaultState.columnCardMap);

//   const [visualState, setVisualState] = useState<VisualState>({
//     activeCardId: null,
//   });

//   // Load from localStorage after mount
//   useEffect(() => {
//     const saved = loadFromStorage();
//     if (!saved) return;
//     setBoardsById(saved.boardsById);
//     setBoardIds(saved.boardIds);
//     setColumnsById(saved.columnsById);
//     setBoardColumnMap(saved.boardColumnMap);
//     setCardsById(saved.cardsById);
//     setColumnCardMap(saved.columnCardMap);
//   }, []);

//   // Save to localStorage
//   useEffect(() => {
//     saveToStorage({ boardsById, boardIds, columnsById, boardColumnMap, cardsById, columnCardMap });
//   }, [boardsById, boardIds, columnsById, boardColumnMap, cardsById, columnCardMap]);

//   const setActiveCardId = useCallback((id: string | null) => {
//     setVisualState((prev) => ({ ...prev, activeCardId: id }));
//   }, []);

//   const createBoard = useCallback(
//     (title: string, description: string = ""): void => {
//       const trimmedTitle = title.trim();
//       if (!trimmedTitle) return;

//       const newId = crypto.randomUUID();

//       const newBoard: Board = {
//         id: newId,
//         title: trimmedTitle,
//         description: description.trim(),
//         dateCreated: new Date(),
//       };

//       setBoardsById((prev) => ({ ...prev, [newId]: newBoard }));
//       setBoardIds((prev) => [...prev, newId]);
//       setBoardColumnMap((prev) => ({ ...prev, [newId]: [] }));
//     },
//     []
//   );

//   const editBoard = useCallback(
//     (boardId: string, updates: Partial<Pick<Board, "title" | "description">>): void => {
//       setBoardsById((prev) => {
//         if (!prev[boardId]) return prev;
//         return { ...prev, [boardId]: { ...prev[boardId], ...updates } };
//       });
//     },
//     []
//   );

//   const deleteBoard = useCallback(
//     (boardId: string): void => {
//       const colIds = boardColumnMap[boardId] ?? [];
//       const cardIdsToRemove = colIds.flatMap((cId) => columnCardMap[cId] ?? []);

//       setCardsById((prev) => {
//         const next = { ...prev };
//         cardIdsToRemove.forEach((id) => delete next[id]);
//         return next;
//       });

//       setColumnCardMap((prev) => {
//         const next = { ...prev };
//         colIds.forEach((id) => delete next[id]);
//         return next;
//       });

//       setColumnsById((prev) => {
//         const next = { ...prev };
//         colIds.forEach((id) => delete next[id]);
//         return next;
//       });

//       setBoardColumnMap((prev) => {
//         const next = { ...prev };
//         delete next[boardId];
//         return next;
//       });

//       setBoardsById((prev) => {
//         const next = { ...prev };
//         delete next[boardId];
//         return next;
//       });
//       setBoardIds((prev) => prev.filter((id) => id !== boardId));
//     },
//     [boardColumnMap, columnCardMap]
//   );

//   const createColumn = useCallback((boardId: string, title: string): void => {
//     const trimmedTitle = title.trim();
//     if (!trimmedTitle) return;

//     if (!boardsById[boardId]) return;

//     const newId = crypto.randomUUID();

//     const newColumn: Column = {
//       id: newId,
//       title: trimmedTitle,
//       boardId,
//     };

//     setColumnsById((prev) => ({ ...prev, [newId]: newColumn }));
//     setBoardColumnMap((prev) => ({
//       ...prev,
//       [boardId]: [...(prev[boardId] ?? []), newId],
//     }));
//     setColumnCardMap((prev) => ({ ...prev, [newId]: [] }));
//   }, [boardsById]);

//   const editColumn = useCallback(
//     (columnId: string, title: string): void => {
//       const trimmedTitle = title.trim();
//       if (!trimmedTitle) return;

//       setColumnsById((prev) => {
//         if (!prev[columnId]) return prev;
//         return {
//           ...prev,
//           [columnId]: { ...prev[columnId], title: trimmedTitle },
//         };
//       });
//     },
//     []
//   );

//   const deleteColumn = useCallback(
//     (columnId: string): void => {
//       const cardIdsToRemove = columnCardMap[columnId] ?? [];

//       setCardsById((prev) => {
//         const next = { ...prev };
//         cardIdsToRemove.forEach((id) => delete next[id]);
//         return next;
//       });

//       setColumnCardMap((prev) => {
//         const next = { ...prev };
//         delete next[columnId];
//         return next;
//       });

//       setColumnsById((prev) => {
//         const boardId = prev[columnId]?.boardId;
//         const next = { ...prev };
//         delete next[columnId];

//         if (boardId) {
//           setBoardColumnMap((prevMap) => ({
//             ...prevMap,
//             [boardId]: prevMap[boardId].filter((id) => id !== columnId),
//           }));
//         }

//         return next;
//       });
//     },
//     [columnCardMap]
//   );

//   const createCard = useCallback(
//     (
//       columnId: string,
//       title: string,
//       description = "",
//       tags: string[] = [],
//       dueDate: Date | null = null
//     ): void => {
//       const trimmedTitle = title.trim();
//       if (!trimmedTitle) return;

//       if (!columnsById[columnId]) return;

//       const newId = crypto.randomUUID();

//       const newCard: Card = {
//         id: newId,
//         title: trimmedTitle,
//         columnId,
//         description,
//         tags,
//         dueDate,
//       };

//       setCardsById((prev) => ({ ...prev, [newId]: newCard }));
//       setColumnCardMap((prev) => ({
//         ...prev,
//         [columnId]: [...(prev[columnId] ?? []), newId],
//       }));
//     },
//     [columnsById]
//   );

//   const editCard = useCallback(
//     (
//       cardId: string,
//       updates: Partial<Omit<Card, "id" | "columnId">>
//     ): void => {
//       setCardsById((prev) => {
//         if (!prev[cardId]) return prev;
//         return { ...prev, [cardId]: { ...prev[cardId], ...updates } };
//       });
//     },
//     []
//   );

//   const deleteCard = useCallback((cardId: string): void => {
//     setCardsById((prev) => {
//       const columnId = prev[cardId]?.columnId;
//       const next = { ...prev };
//       delete next[cardId];

//       if (columnId) {
//         setColumnCardMap((prevMap) => ({
//           ...prevMap,
//           [columnId]: prevMap[columnId].filter((id) => id !== cardId),
//         }));
//       }

//       return next;
//     });
//   }, []);

//   return (
//     <storeContext.Provider
//       value={{
//         boardsById,
//         boardIds,
//         createBoard,
//         editBoard,
//         deleteBoard,
//         columnsById,
//         createColumn,
//         editColumn,
//         deleteColumn,
//         cardsById,
//         createCard,
//         editCard,
//         deleteCard,
//         columnCardMap,
//         boardColumnMap,
//         visualState,
//         setActiveCardId,
//       }}
//     >
//       {children}
//     </storeContext.Provider>
//   );
// };

// export const useStoreContext = () => { // previously useStore
//   const context = useContext(storeContext);
//   if (!context) {
//     throw new Error(
//       "useStoreContext must be used within a StoreProvider"
//     );
//   }
//   return context;
// };