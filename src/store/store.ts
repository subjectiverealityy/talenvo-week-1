// Store - the assembly point for all slices. It combines the board, column and card slices into one Zustand store.
// The devtools middleware enables the Redux DevTools browser extension integration for debugging.
// The persist middleware handles localStorage persistence.
// To swap localStorage for something else, update Zustand's persist options.

import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { PersistedState, VisualState } from "@/store/types";
import { createBoardSlice } from "@/store/slices/boardSlice";
import { createColumnSlice } from "@/store/slices/columnSlice";
import { createCardSlice } from "@/store/slices/cardSlice";
import { createHistorySlice } from "@/store/slices/historySlice";
import type { BoardSlice } from "@/store/slices/boardSlice";
import type { ColumnSlice } from "@/store/slices/columnSlice";
import type { CardSlice } from "@/store/slices/cardSlice";
import type { HistorySlice } from "@/store/slices/historySlice";
import { createCommentSlice } from "@/store/slices/commentSlice";
import type { CommentSlice } from "@/store/slices/commentSlice";

// StoreState combines all the domain states, visual states, and the methods exposed by each slice.
type StoreState = PersistedState &
  VisualState & {
    setActiveCardId: (id: string | null) => void;
  } &
  BoardSlice &
  ColumnSlice &
  CardSlice &
  HistorySlice &
  CommentSlice;

// This object is used to initialize the Zustand store with empty values before any data is loaded. It needs to follow the shape of PersistedState, and should be updated if you add new fields to PersistedState.
const defaultState: PersistedState = {
  boardsById: {},
  boardIds: [],
  columnsById: {},
  boardColumnMap: {},
  cardsById: {},
  columnCardMap: {},
  commentsById: {},
  cardCommentMap: {},
  commentReplyMap: {},
};

// When a Date object is saved to localStorage, it is converted into a string. The JSON reviver restores the string back into a Date object on deserialization. 
// Update the reviver if a new Date field is added to PersistedState.
const persistStorage = createJSONStorage<PersistedState>(() => localStorage, {
  reviver: (key, value) => {
    if ((key === "dateCreated" || key === "dueDate" || key === "editedAt" || key === "createdAt") && typeof value === "string") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed;
    }
    return value;
  },
});
export const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Domain state - initial values from defaultState
        ...defaultState,
        // Visual state - excluded from persistence via partialize below
        activeCardId: null,
        setActiveCardId: (id) =>
          set({ activeCardId: id }, false, "setActiveCardId"),
        // Board slice
        ...createBoardSlice(
          (partial, _replace, action) => set(partial, false, action ?? "board"),
          () => get()
        ),
        // Column slice
        ...createColumnSlice(
          (partial, _replace, action) => set(partial, false, action ?? "column"),
          () => get()
        ),
        // Card slice
        ...createCardSlice(
          (partial, _replace, action) => set(partial, false, action ?? "card"),
          () => get()
        ),
        // History slice
        ...createHistorySlice(
          (partial, _replace, action) => set(partial, false, action ?? "history"),
          () => get()
        ),
        // Comment slice
        ...createCommentSlice(
          (partial, _replace, action) => set(partial, false, action ?? "comment"),
          () => get()
        ),
      }),
      {
        // Versioned key - change to "app_v2" if PersistedState shape changes to avoid silent data corruption from stale stored data.
        name: "app_v1",
        storage: persistStorage,
        // Exclude visual state from being persisted.
        partialize: (state) => ({
          boardsById: state.boardsById,
          boardIds: state.boardIds,
          columnsById: state.columnsById,
          boardColumnMap: state.boardColumnMap,
          cardsById: state.cardsById,
          columnCardMap: state.columnCardMap,
          commentsById: state.commentsById,
          cardCommentMap: state.cardCommentMap,
          commentReplyMap: state.commentReplyMap,
        }),
      }
    ),
    // The name that is shown in Redux DevTools
    { name: "AppStore" }
  )
);
