// Board Slice - connects the pure board action functions to Zustand.
// This is a wiring layer that routes Zustand's 'set' and 'get' to the pure action functions in boardActions.ts.
// createBoardSlice returns an object with three methods: createBoard, editBoard, deleteBoard. Each method calls set() with the result of its corresponding action function, then passes get() as the state argument.

import type { PersistedState } from "@/store/types";
import type { Board } from "@/types";
import { createBoard, editBoard, deleteBoard } from "@/store/actions/boardActions";

export function createBoardSlice(
  set: (partial: Partial<PersistedState>) => void, 
  get: () => PersistedState 
) {
  return {
    // Zustand reads the current state using get(). It then passes the current state and payload into the pure action function so that it can read the state, run the function/perform the actions and return the new state updates. Then Zustand takes that returned partial state and merges it into the store using set() - its way of updating state.

    createBoard: (payload: { title: string; description: string }) =>
      set(createBoard(get(), payload)), 

    editBoard: (payload: { boardId: string; updates: Partial<Pick<Board, "title" | "description">> }) =>
      set(editBoard(get(), payload)),

    deleteBoard: (payload: { boardId: string }) =>
      set(deleteBoard(get(), payload)),
  };
}