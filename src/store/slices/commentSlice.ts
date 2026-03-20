// Comment Slice - connects the pure comment action functions to Zustand.
// Follows the same wiring pattern as boardSlice, columnSlice, and cardSlice.

import type { PersistedState } from "@/store/types";
import { createComment, editComment, deleteComment } from "@/store/actions/commentActions";

export function createCommentSlice(
  set: (partial: Partial<PersistedState>, replace?: boolean, action?: string) => void,
  get: () => PersistedState
) {
  return {
    createComment: (payload: {
      id?: string;
      cardId: string;
      parentId: string | null;
      author: string;
      body: string;
    }) => set(createComment(get(), payload), false, "comment/createComment"),

    editComment: (payload: { commentId: string; body: string }) =>
      set(editComment(get(), payload), false, "comment/editComment"),

    deleteComment: (payload: { commentId: string }) =>
      set(deleteComment(get(), payload), false, "comment/deleteComment"),
  };
}

export type CommentSlice = ReturnType<typeof createCommentSlice>;