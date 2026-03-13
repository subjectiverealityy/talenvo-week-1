// Board Actions - pure functions that handle board state mutations.
// boardsById - full board objects keyed by id
// boardIds - their ids in order
// boardColumnMap - all boards along with all the columns they contain

import type { PersistedState } from "@/store/types";
import type { Board } from "@/types";

export function createBoard(
  state: PersistedState,
  payload: { title: string; description: string }
): Partial<PersistedState> {
  const trimmedTitle = payload.title.trim();
  const trimmedDescription = payload.description.trim();  
  if (!trimmedTitle) return {}; // returning an empty object early if the title is empty or only contains whitespace tells Zustand that there is no state update to apply.

  const newId = crypto.randomUUID();

  // Newly created board object
  const createdBoard: Board = {
    id: newId,
    title: trimmedTitle,
    description: trimmedDescription,
    dateCreated: new Date(),
  };

  return {
    boardsById: { ...state.boardsById, [newId]: createdBoard}, // i.e. "b1": {id: "b1", title: "Board 1", description: "", dateCreated: Date object}, "b2": {...}, "b3": {...} }
    boardIds: [...state.boardIds, newId], // i.e. ["b1", "b2", "b3"]
    boardColumnMap: { ...state.boardColumnMap, [newId]: [] }, // i.e. "b1": [], "b2": ["c1", "c2"], "b3": ["c3"]
  };
}

export function editBoard(
  state: PersistedState,
  payload: { boardId: string; updates: Partial<Pick<Board, "title" | "description">> }
): Partial<PersistedState> {
  if (!state.boardsById[payload.boardId]) return {};

  return {
    boardsById: {
      ...state.boardsById, 
      [payload.boardId]: { // Overwrite the entry at payload.boardId with a new object
        ...state.boardsById[payload.boardId], // First spread copies all existing fields of the board being edited.
        ...payload.updates, // Second spread overwrites only the fields present in updates.
      },
    },
  };
}

// When a board is deleted, its cards, columns and all maps are also deleted to prevent orphaned entities. This function handles that cascade deletion by first identifying all columns linked to the board, then all cards linked to those columns, and finally removing them from their respective maps and lookup objects..
export function deleteBoard(
  state: PersistedState,
  payload: { boardId: string }
): Partial<PersistedState> {
  const columnIds = state.boardColumnMap[payload.boardId] ?? [];
  const cardIdsToRemove = columnIds.flatMap((columnId) => state.columnCardMap[columnId] ?? []);

  const cardsById = { ...state.cardsById };
  cardIdsToRemove.forEach((id) => delete cardsById[id]);

  const columnCardMap = { ...state.columnCardMap };
  columnIds.forEach((id) => delete columnCardMap[id]);

  const columnsById = { ...state.columnsById };
  columnIds.forEach((id) => delete columnsById[id]);

  const boardColumnMap = { ...state.boardColumnMap };
  delete boardColumnMap[payload.boardId];

  const boardsById = { ...state.boardsById };
  delete boardsById[payload.boardId];

  return {
    cardsById,
    columnCardMap,
    columnsById,
    boardColumnMap,
    boardsById,
    boardIds: state.boardIds.filter((id) => id !== payload.boardId),
  };
}