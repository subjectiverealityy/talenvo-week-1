// Comment Actions - pure functions that handle comment state mutations.
// commentsById - full comment objects keyed by id
// cardCommentMap - maps card ids to their top-level comment ids
// commentReplyMap - maps comment ids to their reply ids
// Comments are 2 levels deep: top-level comments and one level of replies.

import type { PersistedState } from "@/store/types";
import type { Comment } from "@/types";

export function createComment(
  state: PersistedState,
  payload: { cardId: string; parentId: string | null; author: string; body: string }
): Partial<PersistedState> {
  const trimmedBody = payload.body.trim();
  if (!trimmedBody) return {};
  if (!state.cardsById[payload.cardId]) return {};
  if (payload.parentId && !state.commentsById[payload.parentId]) return {};

  const newId = crypto.randomUUID();

  const newComment: Comment = {
    id: newId,
    cardId: payload.cardId,
    parentId: payload.parentId,
    author: payload.author,
    body: trimmedBody,
    createdAt: new Date(),
    editedAt: null,
  };

  const commentsById = { ...state.commentsById, [newId]: newComment };

  if (payload.parentId) {
    // Reply — add to commentReplyMap under the parent
    return {
      commentsById,
      commentReplyMap: {
        ...state.commentReplyMap,
        [payload.parentId]: [...(state.commentReplyMap[payload.parentId] ?? []), newId],
      },
    };
  }

  // Top-level comment — add to cardCommentMap under the card
  return {
    commentsById,
    cardCommentMap: {
      ...state.cardCommentMap,
      [payload.cardId]: [...(state.cardCommentMap[payload.cardId] ?? []), newId],
    },
    commentReplyMap: {
      ...state.commentReplyMap,
      [newId]: [], // initialise reply list for this comment
    },
  };
}

export function editComment(
  state: PersistedState,
  payload: { commentId: string; body: string }
): Partial<PersistedState> {
  const trimmedBody = payload.body.trim();
  if (!trimmedBody) return {};
  if (!state.commentsById[payload.commentId]) return {};

  return {
    commentsById: {
      ...state.commentsById,
      [payload.commentId]: {
        ...state.commentsById[payload.commentId],
        body: trimmedBody,
        editedAt: new Date(),
      },
    },
  };
}

// Deleting a comment also deletes all its replies to prevent orphaned entities.
export function deleteComment(
  state: PersistedState,
  payload: { commentId: string }
): Partial<PersistedState> {
  const comment = state.commentsById[payload.commentId];
  if (!comment) return {};

  const replyIds = state.commentReplyMap[payload.commentId] ?? [];

  const commentsById = { ...state.commentsById };
  delete commentsById[payload.commentId];
  replyIds.forEach((id) => delete commentsById[id]);

  const commentReplyMap = { ...state.commentReplyMap };
  delete commentReplyMap[payload.commentId];

  if (comment.parentId) {
    // Removing a reply — update parent's reply list
    commentReplyMap[comment.parentId] = (
      commentReplyMap[comment.parentId] ?? []
    ).filter((id) => id !== payload.commentId);

    return { commentsById, commentReplyMap };
  }

  // Removing a top-level comment — update the card's comment list
  const cardCommentMap = { ...state.cardCommentMap };
  cardCommentMap[comment.cardId] = (
    cardCommentMap[comment.cardId] ?? []
  ).filter((id) => id !== payload.commentId);

  return { commentsById, commentReplyMap, cardCommentMap };
}

// Called by deleteCard to cascade-delete all comments on a card.
export function deleteCardComments(
  state: PersistedState,
  payload: { cardId: string }
): Partial<PersistedState> {
  const topLevelIds = state.cardCommentMap[payload.cardId] ?? [];
  const replyIds = topLevelIds.flatMap(
    (id) => state.commentReplyMap[id] ?? []
  );
  const allIds = [...topLevelIds, ...replyIds];

  const commentsById = { ...state.commentsById };
  allIds.forEach((id) => delete commentsById[id]);

  const commentReplyMap = { ...state.commentReplyMap };
  topLevelIds.forEach((id) => delete commentReplyMap[id]);

  const cardCommentMap = { ...state.cardCommentMap };
  delete cardCommentMap[payload.cardId];

  return { commentsById, commentReplyMap, cardCommentMap };
}