import { describe, it, expect } from "vitest";
import {
  createComment,
  editComment,
  deleteComment,
  deleteCardComments,
} from "@/store/actions/commentActions";
import type { PersistedState } from "@/store/types";
import type { Comment } from "@/types";

function makeState(overrides: Partial<PersistedState> = {}): PersistedState {
  return {
    boardsById: {},
    boardIds: [],
    columnsById: { col1: { id: "col1", title: "Column 1", boardId: "board1" } },
    boardColumnMap: { board1: ["col1"] },
    cardsById: {
      card1: {
        id: "card1",
        title: "Test Card",
        description: "",
        tags: [],
        dueDate: null,
        columnId: "col1",
      },
    },
    columnCardMap: { col1: ["card1"] },
    commentsById: {},
    cardCommentMap: { card1: [] },
    commentReplyMap: {},
    ...overrides,
  };
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment1",
    cardId: "card1",
    parentId: null,
    author: "Alice",
    body: "Test comment",
    createdAt: new Date("2024-01-01"),
    editedAt: null,
    ...overrides,
  };
}

// Create a comment
describe("createComment", () => {
  it("creates a top-level comment on a card", () => {
    const state = makeState();
    const result = createComment(state, {
      cardId: "card1",
      parentId: null,
      author: "Alice",
      body: "Hello",
    });

    const newId = Object.keys(result.commentsById ?? {})[0];
    expect(result.commentsById?.[newId]).toMatchObject({
      cardId: "card1",
      parentId: null,
      author: "Alice",
      body: "Hello",
      editedAt: null,
    });
    expect(result.cardCommentMap?.["card1"]).toContain(newId);
    expect(result.commentReplyMap?.[newId]).toEqual([]);
  });

  it("creates a reply to an existing comment", () => {
    const comment = makeComment();
    const state = makeState({
      commentsById: { comment1: comment },
      cardCommentMap: { card1: ["comment1"] },
      commentReplyMap: { comment1: [] },
    });

    const result = createComment(state, {
      cardId: "card1",
      parentId: "comment1",
      author: "Bob",
      body: "Reply here",
    });

    const replyId = Object.keys(result.commentsById ?? {}).find(
      (id) => id !== "comment1"
    )!;

    expect(result.commentsById?.[replyId]).toMatchObject({
      parentId: "comment1",
      author: "Bob",
      body: "Reply here",
    });
    expect(result.commentReplyMap?.["comment1"]).toContain(replyId);
  });

  it("returns empty object if body is empty", () => {
    const state = makeState();
    const result = createComment(state, {
      cardId: "card1",
      parentId: null,
      author: "Alice",
      body: "   ",
    });
    expect(result).toEqual({});
  });

  it("returns empty object if card does not exist", () => {
    const state = makeState();
    const result = createComment(state, {
      cardId: "nonexistent",
      parentId: null,
      author: "Alice",
      body: "Hello",
    });
    expect(result).toEqual({});
  });

  it("returns empty object if parent comment does not exist", () => {
    const state = makeState();
    const result = createComment(state, {
      cardId: "card1",
      parentId: "nonexistent",
      author: "Alice",
      body: "Reply",
    });
    expect(result).toEqual({});
  });

  it("trims whitespace from body", () => {
    const state = makeState();
    const result = createComment(state, {
      cardId: "card1",
      parentId: null,
      author: "Alice",
      body: "  Hello  ",
    });
    const newId = Object.keys(result.commentsById ?? {})[0];
    expect(result.commentsById?.[newId].body).toBe("Hello");
  });

  it("appends to existing top-level comments", () => {
    const comment = makeComment();
    const state = makeState({
      commentsById: { comment1: comment },
      cardCommentMap: { card1: ["comment1"] },
      commentReplyMap: { comment1: [] },
    });

    const result = createComment(state, {
      cardId: "card1",
      parentId: null,
      author: "Bob",
      body: "Second comment",
    });

    expect(result.cardCommentMap?.["card1"]).toHaveLength(2);
    expect(result.cardCommentMap?.["card1"][0]).toBe("comment1");
  });
});

// Edit a comment
describe("editComment", () => {
  it("updates the comment body and sets editedAt", () => {
    const comment = makeComment();
    const state = makeState({
      commentsById: { comment1: comment },
      cardCommentMap: { card1: ["comment1"] },
      commentReplyMap: { comment1: [] },
    });

    const result = editComment(state, {
      commentId: "comment1",
      body: "Updated body",
    });

    expect(result.commentsById?.["comment1"].body).toBe("Updated body");
    expect(result.commentsById?.["comment1"].editedAt).not.toBeNull();
  });

  it("returns empty object if comment does not exist", () => {
    const state = makeState();
    const result = editComment(state, {
      commentId: "nonexistent",
      body: "Updated",
    });
    expect(result).toEqual({});
  });

  it("returns empty object if body is empty", () => {
    const comment = makeComment();
    const state = makeState({
      commentsById: { comment1: comment },
      cardCommentMap: { card1: ["comment1"] },
      commentReplyMap: { comment1: [] },
    });

    const result = editComment(state, {
      commentId: "comment1",
      body: "   ",
    });
    expect(result).toEqual({});
  });

  it("trims whitespace from updated body", () => {
    const comment = makeComment();
    const state = makeState({
      commentsById: { comment1: comment },
      cardCommentMap: { card1: ["comment1"] },
      commentReplyMap: { comment1: [] },
    });

    const result = editComment(state, {
      commentId: "comment1",
      body: "  Trimmed  ",
    });
    expect(result.commentsById?.["comment1"].body).toBe("Trimmed");
  });

  it("does not modify other fields when editing", () => {
    const comment = makeComment();
    const state = makeState({
      commentsById: { comment1: comment },
      cardCommentMap: { card1: ["comment1"] },
      commentReplyMap: { comment1: [] },
    });

    const result = editComment(state, {
      commentId: "comment1",
      body: "Updated",
    });

    expect(result.commentsById?.["comment1"].author).toBe("Alice");
    expect(result.commentsById?.["comment1"].cardId).toBe("card1");
    expect(result.commentsById?.["comment1"].parentId).toBeNull();
  });
});

// Delete a comment
describe("deleteComment", () => {
  it("deletes a top-level comment and removes it from cardCommentMap", () => {
    const comment = makeComment();
    const state = makeState({
      commentsById: { comment1: comment },
      cardCommentMap: { card1: ["comment1"] },
      commentReplyMap: { comment1: [] },
    });

    const result = deleteComment(state, { commentId: "comment1" });

    expect(result.commentsById?.["comment1"]).toBeUndefined();
    expect(result.cardCommentMap?.["card1"]).not.toContain("comment1");
  });

  it("deletes a top-level comment and all its replies", () => {
    const comment = makeComment();
    const reply = makeComment({ id: "reply1", parentId: "comment1" });
    const state = makeState({
      commentsById: { comment1: comment, reply1: reply },
      cardCommentMap: { card1: ["comment1"] },
      commentReplyMap: { comment1: ["reply1"] },
    });

    const result = deleteComment(state, { commentId: "comment1" });

    expect(result.commentsById?.["comment1"]).toBeUndefined();
    expect(result.commentsById?.["reply1"]).toBeUndefined();
    expect(result.commentReplyMap?.["comment1"]).toBeUndefined();
  });

  it("deletes a reply and removes it from parent's reply list", () => {
    const comment = makeComment();
    const reply = makeComment({ id: "reply1", parentId: "comment1" });
    const state = makeState({
      commentsById: { comment1: comment, reply1: reply },
      cardCommentMap: { card1: ["comment1"] },
      commentReplyMap: { comment1: ["reply1"] },
    });

    const result = deleteComment(state, { commentId: "reply1" });

    expect(result.commentsById?.["reply1"]).toBeUndefined();
    expect(result.commentReplyMap?.["comment1"]).not.toContain("reply1");
    expect(result.commentsById?.["comment1"]).toBeDefined();
  });

  it("returns empty object if comment does not exist", () => {
    const state = makeState();
    const result = deleteComment(state, { commentId: "nonexistent" });
    expect(result).toEqual({});
  });

  it("does not affect other comments when deleting one", () => {
    const comment1 = makeComment();
    const comment2 = makeComment({ id: "comment2" });
    const state = makeState({
      commentsById: { comment1, comment2 },
      cardCommentMap: { card1: ["comment1", "comment2"] },
      commentReplyMap: { comment1: [], comment2: [] },
    });

    const result = deleteComment(state, { commentId: "comment1" });

    expect(result.commentsById?.["comment2"]).toBeDefined();
    expect(result.cardCommentMap?.["card1"]).toContain("comment2");
  });
});

// Delete card comments
describe("deleteCardComments", () => {
  it("deletes all comments and replies on a card", () => {
    const comment = makeComment();
    const reply = makeComment({ id: "reply1", parentId: "comment1" });
    const state = makeState({
      commentsById: { comment1: comment, reply1: reply },
      cardCommentMap: { card1: ["comment1"] },
      commentReplyMap: { comment1: ["reply1"] },
    });

    const result = deleteCardComments(state, { cardId: "card1" });

    expect(result.commentsById?.["comment1"]).toBeUndefined();
    expect(result.commentsById?.["reply1"]).toBeUndefined();
    expect(result.cardCommentMap?.["card1"]).toBeUndefined();
    expect(result.commentReplyMap?.["comment1"]).toBeUndefined();
  });

  it("returns empty maps when card has no comments", () => {
    const state = makeState();
    const result = deleteCardComments(state, { cardId: "card1" });

    expect(result.commentsById).toEqual({});
    expect(result.cardCommentMap?.["card1"]).toBeUndefined();
  });

  it("does not affect comments on other cards", () => {
    const comment1 = makeComment();
    const comment2 = makeComment({ id: "comment2", cardId: "card2" });
    const state = makeState({
      cardsById: {
        card1: {
          id: "card1",
          title: "Card 1",
          description: "",
          tags: [],
          dueDate: null,
          columnId: "col1",
        },
        card2: {
          id: "card2",
          title: "Card 2",
          description: "",
          tags: [],
          dueDate: null,
          columnId: "col1",
        },
      },
      commentsById: { comment1, comment2 },
      cardCommentMap: { card1: ["comment1"], card2: ["comment2"] },
      commentReplyMap: { comment1: [], comment2: [] },
    });

    const result = deleteCardComments(state, { cardId: "card1" });

    expect(result.commentsById?.["comment2"]).toBeDefined();
    expect(result.cardCommentMap?.["card2"]).toContain("comment2");
  });

  it("handles multiple top-level comments with replies", () => {
    const comment1 = makeComment();
    const comment2 = makeComment({ id: "comment2" });
    const reply1 = makeComment({ id: "reply1", parentId: "comment1" });
    const reply2 = makeComment({ id: "reply2", parentId: "comment2" });
    const state = makeState({
      commentsById: { comment1, comment2, reply1, reply2 },
      cardCommentMap: { card1: ["comment1", "comment2"] },
      commentReplyMap: { comment1: ["reply1"], comment2: ["reply2"] },
    });

    const result = deleteCardComments(state, { cardId: "card1" });

    expect(Object.keys(result.commentsById ?? {})).toHaveLength(0);
    expect(result.cardCommentMap?.["card1"]).toBeUndefined();
    expect(result.commentReplyMap?.["comment1"]).toBeUndefined();
    expect(result.commentReplyMap?.["comment2"]).toBeUndefined();
  });
});