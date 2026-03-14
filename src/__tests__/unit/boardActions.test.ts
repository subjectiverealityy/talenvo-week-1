import { describe, it, expect } from "vitest";
import { createBoard, editBoard, deleteBoard } from "@/store/actions/boardActions";
import type { PersistedState } from "@/store/types";

const emptyState: PersistedState = {
  boardsById: {},
  boardIds: [],
  columnsById: {},
  boardColumnMap: {},
  cardsById: {},
  columnCardMap: {},
};

describe("createBoard", () => {
  it("creates a board with a valid title", () => {
    const result = createBoard(emptyState, { title: "My Board", description: "" });
    expect(Object.keys(result.boardsById!)).toHaveLength(1);
    expect(result.boardIds).toHaveLength(1);
  });

  it("sets the correct title and description", () => {
    const result = createBoard(emptyState, { title: "My Board", description: "A description" });
    const boardId = result.boardIds![0];
    expect(result.boardsById![boardId].title).toBe("My Board");
    expect(result.boardsById![boardId].description).toBe("A description");
  });

  it("trims whitespace from title", () => {
    const result = createBoard(emptyState, { title: "  My Board  ", description: "" });
    const boardId = result.boardIds![0];
    expect(result.boardsById![boardId].title).toBe("My Board");
  });

  it("initializes boardColumnMap with empty array", () => {
    const result = createBoard(emptyState, { title: "My Board", description: "" });
    const boardId = result.boardIds![0];
    expect(result.boardColumnMap![boardId]).toEqual([]);
  });

  it("returns empty object if title is empty", () => {
    const result = createBoard(emptyState, { title: "", description: "" });
    expect(result).toEqual({});
  });

  it("returns empty object if title is only whitespace", () => {
    const result = createBoard(emptyState, { title: "   ", description: "" });
    expect(result).toEqual({});
  });

  it("sets dateCreated as a Date object", () => {
    const result = createBoard(emptyState, { title: "My Board", description: "" });
    const boardId = result.boardIds![0];
    expect(result.boardsById![boardId].dateCreated).toBeInstanceOf(Date);
  });
});

describe("editBoard", () => {
  it("updates board title", () => {
    const created = createBoard(emptyState, { title: "Old Title", description: "" }) as PersistedState;
    const boardId = created.boardIds[0];
    const result = editBoard(created, { boardId, updates: { title: "New Title" } });
    expect(result.boardsById![boardId].title).toBe("New Title");
  });

  it("updates board description", () => {
    const created = createBoard(emptyState, { title: "My Board", description: "Old" }) as PersistedState;
    const boardId = created.boardIds[0];
    const result = editBoard(created, { boardId, updates: { description: "New" } });
    expect(result.boardsById![boardId].description).toBe("New");
  });

  it("preserves other fields when editing title only", () => {
    const created = createBoard(emptyState, { title: "My Board", description: "Keep this" }) as PersistedState;
    const boardId = created.boardIds[0];
    const result = editBoard(created, { boardId, updates: { title: "New Title" } });
    expect(result.boardsById![boardId].description).toBe("Keep this");
  });

  it("returns empty object if board does not exist", () => {
    const result = editBoard(emptyState, { boardId: "nonexistent", updates: { title: "Title" } });
    expect(result).toEqual({});
  });
});

describe("deleteBoard", () => {
  it("removes board from boardsById", () => {
    const created = createBoard(emptyState, { title: "My Board", description: "" }) as PersistedState;
    const boardId = created.boardIds[0];
    const result = deleteBoard(created, { boardId });
    expect(result.boardsById![boardId]).toBeUndefined();
  });

  it("removes board from boardIds", () => {
    const created = createBoard(emptyState, { title: "My Board", description: "" }) as PersistedState;
    const boardId = created.boardIds[0];
    const result = deleteBoard(created, { boardId });
    expect(result.boardIds).not.toContain(boardId);
  });

  it("removes board from boardColumnMap", () => {
    const created = createBoard(emptyState, { title: "My Board", description: "" }) as PersistedState;
    const boardId = created.boardIds[0];
    const result = deleteBoard(created, { boardId });
    expect(result.boardColumnMap![boardId]).toBeUndefined();
  });

  it("returns empty boardIds array when the last board is deleted", () => {
    const created = createBoard(emptyState, { title: "My Board", description: "" }) as PersistedState;
    const boardId = created.boardIds[0];
    const result = deleteBoard(created, { boardId });
    expect(result.boardIds).toHaveLength(0);
  });
});