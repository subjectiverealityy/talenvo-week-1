// Comment Slice - connects the pure comment action functions to Zustand.
// Follows the same wiring pattern as boardSlice, columnSlice, and cardSlice.

import type { PersistedState } from "@/store/types";
import { createComment, editComment, deleteComment } from "@/store/actions/commentActions";

export function createCommentSlice(
  set: (partial: Partial<PersistedState>) => void,
  get: () => PersistedState
) {
  return {
    createComment: (payload: {
      cardId: string;
      parentId: string | null;
      author: string;
      body: string;
    }) => set(createComment(get(), payload)),

    editComment: (payload: { commentId: string; body: string }) =>
      set(editComment(get(), payload)),

    deleteComment: (payload: { commentId: string }) =>
      set(deleteComment(get(), payload)),
  };
}

export type CommentSlice = ReturnType<typeof createCommentSlice>;