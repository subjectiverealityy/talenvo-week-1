// Column Slice - connects the pure column action functions to Zustand.
// This is a wiring layer that routes Zustand's 'set' and 'get' to the pure action functions in columnActions.ts.
// createColumnSlice returns an object with three methods: createColumn, editColumn, deleteColumn.
// refer to BoardSlice.ts for useful comments that carry over to this file.

import type { PersistedState } from "@/store/types";
import { createColumn, editColumn, deleteColumn } from "@/store/actions/columnActions";

export function createColumnSlice(
  set: (partial: Partial<PersistedState>) => void,
  get: () => PersistedState
) {
  return {
    createColumn: (payload: { boardId: string; title: string }) =>
      set(createColumn(get(), payload)),

    editColumn: (payload: { columnId: string; title: string }) =>
      set(editColumn(get(), payload)),

    deleteColumn: (payload: { columnId: string }) =>
      set(deleteColumn(get(), payload)),
  };
}