// Column Actions - pure functions that handle column state mutations.
// columnsById - full column objects keyed by id
// boardColumnMap - all boards along with all the columns they contain
// columnCardMap - all columns along with all the cards they contain
// refer to BoardActions.ts for useful comments that carry over to this file.

import type { PersistedState } from "@/store/types";
import type { Column } from "@/types";

export function createColumn(
  state: PersistedState,
  payload: { boardId: string; title: string }
): Partial<PersistedState> {
  const trimmedTitle = payload.title.trim();
  if (!trimmedTitle) return {};

  // Guards against adding a column to a board that does not exist
  if (!state.boardsById[payload.boardId]) return {};

  const newId = crypto.randomUUID();

  const createdColumn: Column = {
    id: newId,
    title: trimmedTitle,
    boardId: payload.boardId,
  };

  return {
    columnsById: { ...state.columnsById, [newId]: createdColumn },
    boardColumnMap: {
      ...state.boardColumnMap,
      [payload.boardId]: [...(state.boardColumnMap[payload.boardId] ?? []), newId],
    },
    columnCardMap: { ...state.columnCardMap, [newId]: [] },
  };
}

export function editColumn(
  state: PersistedState,
  payload: { columnId: string; title: string }
): Partial<PersistedState> {
  const trimmedTitle = payload.title.trim();
  if (!trimmedTitle) return {};

  // Guard against editing a column that doesn't exist
  if (!state.columnsById[payload.columnId]) return {};

  return {
    columnsById: {
      ...state.columnsById,
      [payload.columnId]: {
        ...state.columnsById[payload.columnId],
        title: trimmedTitle,
      },
    },
  };
}

// When a column is deleted, its cards and all maps are also deleted to prevent orphaned entities. This function handles that cascade deletion by first identifying all cards linked to the column, then removing them from their respective maps and lookup objects.
export function deleteColumn( 
  state: PersistedState,
  payload: { columnId: string }
): Partial<PersistedState> {
  const cardIdsToRemove = state.columnCardMap[payload.columnId] ?? [];
  const boardId = state.columnsById[payload.columnId]?.boardId; // deleteColumn reads boardId from columnsById before deleting the column. If it deletes the column first, boardId will be gone before it can update boardColumnMap

  const cardsById = { ...state.cardsById };
  cardIdsToRemove.forEach((id) => delete cardsById[id]);

  const columnCardMap = { ...state.columnCardMap };
  delete columnCardMap[payload.columnId];

  const columnsById = { ...state.columnsById };
  delete columnsById[payload.columnId];

  const boardColumnMap = { ...state.boardColumnMap };
  if (boardId) {
    boardColumnMap[boardId] = boardColumnMap[boardId].filter(
      (id) => id !== payload.columnId
    );
  }

  return {
    cardsById,
    columnCardMap,
    columnsById,
    boardColumnMap,
  };
}