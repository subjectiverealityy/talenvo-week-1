import { describe, it, expect } from "vitest";
import { createColumn, editColumn, deleteColumn } from "@/store/actions/columnActions";
import { createBoard } from "@/store/actions/boardActions";
import type { PersistedState } from "@/store/types";

const emptyState: PersistedState = {
  boardsById: {},
  boardIds: [],
  columnsById: {},
  boardColumnMap: {},
  cardsById: {},
  columnCardMap: {},
};

// Creates a state with a single board that is ready to receive columns
function stateWithBoard(): { state: PersistedState; boardId: string } {
  const state = createBoard(emptyState, { title: "My Board", description: "" }) as PersistedState;
  const boardId = state.boardIds[0];
  return { state, boardId };
}

describe("createColumn", () => {
  it("creates a column with a valid title", () => {
    const { state, boardId } = stateWithBoard();
    const result = createColumn(state, { boardId, title: "My Column" });
    expect(Object.keys(result.columnsById!)).toHaveLength(1);
  });

  it("sets the correct title and boardId", () => {
    const { state, boardId } = stateWithBoard();
    const result = createColumn(state, { boardId, title: "My Column" });
    const columnId = Object.keys(result.columnsById!)[0];
    expect(result.columnsById![columnId].title).toBe("My Column");
    expect(result.columnsById![columnId].boardId).toBe(boardId);
  });

  it("adds column id to boardColumnMap", () => {
    const { state, boardId } = stateWithBoard();
    const result = createColumn(state, { boardId, title: "My Column" });
    const columnId = Object.keys(result.columnsById!)[0];
    expect(result.boardColumnMap![boardId]).toContain(columnId);
  });

  it("initializes columnCardMap with empty array", () => {
    const { state, boardId } = stateWithBoard();
    const result = createColumn(state, { boardId, title: "My Column" });
    const columnId = Object.keys(result.columnsById!)[0];
    expect(result.columnCardMap![columnId]).toEqual([]);
  });

  it("returns empty object if title is empty", () => {
    const { state, boardId } = stateWithBoard();
    const result = createColumn(state, { boardId, title: "" });
    expect(result).toEqual({});
  });

  it("returns empty object if title is only whitespace", () => {
    const { state, boardId } = stateWithBoard();
    const result = createColumn(state, { boardId, title: "   " });
    expect(result).toEqual({});
  });

  it("returns empty object if board does not exist", () => {
    const result = createColumn(emptyState, { boardId: "nonexistent", title: "My Column" });
    expect(result).toEqual({});
  });
});

describe("editColumn", () => {
  it("updates column title", () => {
    const { state, boardId } = stateWithBoard();
    const created = createColumn(state, { boardId, title: "Old Title" }) as PersistedState;
    const columnId = Object.keys(created.columnsById)[0];
    const result = editColumn(created, { columnId, title: "New Title" });
    expect(result.columnsById![columnId].title).toBe("New Title");
  });

  it("returns empty object if title is empty", () => {
    const { state, boardId } = stateWithBoard();
    const created = createColumn(state, { boardId, title: "My Column" }) as PersistedState;
    const columnId = Object.keys(created.columnsById)[0];
    const result = editColumn(created, { columnId, title: "" });
    expect(result).toEqual({});
  });

  it("returns empty object if column does not exist", () => {
    const result = editColumn(emptyState, { columnId: "nonexistent", title: "Title" });
    expect(result).toEqual({});
  });
});

describe("deleteColumn", () => {
  it("removes column from columnsById", () => {
    const { state, boardId } = stateWithBoard();
    const created = createColumn(state, { boardId, title: "My Column" }) as PersistedState;
    const columnId = Object.keys(created.columnsById)[0];
    const result = deleteColumn(created, { columnId });
    expect(result.columnsById![columnId]).toBeUndefined();
  });

  it("removes column from boardColumnMap", () => {
    const { state, boardId } = stateWithBoard();
    const created = createColumn(state, { boardId, title: "My Column" }) as PersistedState;
    const columnId = Object.keys(created.columnsById)[0];
    const result = deleteColumn(created, { columnId });
    expect(result.boardColumnMap![boardId]).not.toContain(columnId);
  });

  it("removes column from columnCardMap", () => {
    const { state, boardId } = stateWithBoard();
    const created = createColumn(state, { boardId, title: "My Column" }) as PersistedState;
    const columnId = Object.keys(created.columnsById)[0];
    const result = deleteColumn(created, { columnId });
    expect(result.columnCardMap![columnId]).toBeUndefined();
  });
});