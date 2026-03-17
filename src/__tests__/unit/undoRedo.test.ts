import { describe, it, expect } from "vitest";
import { createHistorySlice } from "@/store/slices/historySlice";
import type { HistoryAction, HistoryState } from "@/store/slices/historySlice";
import type { PersistedState } from "@/store/types";
import type { Card } from "@/types";

function makeState(overrides: Partial<PersistedState & HistoryState> = {}): PersistedState & HistoryState {
  return {
    boardsById: {},
    boardIds: [],
    columnsById: {
      col1: { id: "col1", title: "Column 1", boardId: "board1" },
      col2: { id: "col2", title: "Column 2", boardId: "board1" },
    },
    boardColumnMap: { board1: ["col1", "col2"] },
    cardsById: {},
    columnCardMap: { col1: [], col2: [] },
    commentsById: {},
    cardCommentMap: {},
    commentReplyMap: {},
    past: [],
    future: [],
    ...overrides,
  };
}

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card1",
    title: "Test Card",
    description: "",
    tags: [],
    dueDate: null,
    columnId: "col1",
    ...overrides,
  };
}

function makeSlice(initialState: PersistedState & HistoryState) {
  let state = { ...initialState };

  const set = (
    partial: Partial<PersistedState & HistoryState>,
    _replace?: boolean,
    _action?: string
  ) => {
    state = { ...state, ...partial };
  };

  const get = () => state;
  const slice = createHistorySlice(set, get);
  state = { ...slice, ...state };

  return { slice, getState: get };
}

// pushHistory
describe("pushHistory", () => {
  it("adds an action to past", () => {
    const { slice, getState } = makeSlice(makeState());
    const action: HistoryAction = {
      type: "CREATE_CARD",
      payload: { card: makeCard(), columnId: "col1", index: 0 },
    };
    slice.pushHistory(action);
    expect(getState().past).toHaveLength(1);
    expect(getState().past[0]).toEqual(action);
  });

  it("clears future when a new action is pushed", () => {
    const action: HistoryAction = {
      type: "CREATE_CARD",
      payload: { card: makeCard(), columnId: "col1", index: 0 },
    };
    const { slice, getState } = makeSlice(makeState({ future: [action] }));
    slice.pushHistory(action);
    expect(getState().future).toHaveLength(0);
  });

  it("drops the oldest entry when MAX_HISTORY is exceeded", () => {
    const past: HistoryAction[] = Array.from({ length: 50 }, (_, i) => ({
      type: "CREATE_CARD" as const,
      payload: { card: makeCard({ id: `card${i}` }), columnId: "col1", index: i },
    }));
    const { slice, getState } = makeSlice(makeState({ past }));
    const newAction: HistoryAction = {
      type: "CREATE_CARD",
      payload: { card: makeCard({ id: "card50" }), columnId: "col1", index: 50 },
    };
    slice.pushHistory(newAction);
    expect(getState().past).toHaveLength(50);
    expect(getState().past[49]).toEqual(newAction);
    expect(getState().past[0].payload).toMatchObject({ card: { id: "card1" } });
  });
});

// canUndo / canRedo
describe("canUndo / canRedo", () => {
  it("returns false for canUndo when past is empty", () => {
    const { slice } = makeSlice(makeState());
    expect(slice.canUndo()).toBe(false);
  });

  it("returns true for canUndo when past has entries", () => {
    const { slice } = makeSlice(
      makeState({
        past: [{
          type: "CREATE_CARD",
          payload: { card: makeCard(), columnId: "col1", index: 0 },
        }],
      })
    );
    expect(slice.canUndo()).toBe(true);
  });

  it("returns false for canRedo when future is empty", () => {
    const { slice } = makeSlice(makeState());
    expect(slice.canRedo()).toBe(false);
  });

  it("returns true for canRedo when future has entries", () => {
    const { slice } = makeSlice(
      makeState({
        future: [{
          type: "CREATE_CARD",
          payload: { card: makeCard(), columnId: "col1", index: 0 },
        }],
      })
    );
    expect(slice.canRedo()).toBe(true);
  });
});

// undo
describe("undo", () => {
  it("does nothing when past is empty", () => {
    const { slice, getState } = makeSlice(makeState());
    slice.undo();
    expect(getState().past).toHaveLength(0);
    expect(getState().future).toHaveLength(0);
  });

  it("undoes CREATE_CARD by removing the card", () => {
    const card = makeCard();
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: { card1: card },
        columnCardMap: { col1: ["card1"], col2: [] },
        past: [{
          type: "CREATE_CARD",
          payload: { card, columnId: "col1", index: 0 },
        }],
      })
    );
    slice.undo();
    expect(getState().cardsById["card1"]).toBeUndefined();
    expect(getState().columnCardMap["col1"]).not.toContain("card1");
    expect(getState().past).toHaveLength(0);
    expect(getState().future).toHaveLength(1);
  });

  it("undoes DELETE_CARD by restoring the card at its original position", () => {
    const card = makeCard();
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: {},
        columnCardMap: { col1: [], col2: [] },
        past: [{
          type: "DELETE_CARD",
          payload: { card, columnId: "col1", index: 0 },
        }],
      })
    );
    slice.undo();
    expect(getState().cardsById["card1"]).toEqual(card);
    expect(getState().columnCardMap["col1"][0]).toBe("card1");
  });

  it("undoes MOVE_CARD by moving the card back to its original column", () => {
    const card = makeCard({ id: "card1", columnId: "col2" });
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: { card1: card },
        columnCardMap: { col1: [], col2: ["card1"] },
        past: [{
          type: "MOVE_CARD",
          payload: {
            cardId: "card1",
            fromColumnId: "col1",
            toColumnId: "col2",
            fromIndex: 0,
            toIndex: 0,
          },
        }],
      })
    );
    slice.undo();
    expect(getState().columnCardMap["col1"]).toContain("card1");
    expect(getState().columnCardMap["col2"]).not.toContain("card1");
  });

  it("undoes MOVE_CARD by restoring card to original index within same column", () => {
    const card1 = makeCard({ id: "card1", columnId: "col1" });
    const card2 = makeCard({ id: "card2", columnId: "col1" });
    const card3 = makeCard({ id: "card3", columnId: "col1" });
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: { card1, card2, card3 },
        columnCardMap: { col1: ["card2", "card3", "card1"], col2: [] },
        past: [{
          type: "MOVE_CARD",
          payload: {
            cardId: "card1",
            fromColumnId: "col1",
            toColumnId: "col1",
            fromIndex: 0,
            toIndex: 2,
          },
        }],
      })
    );
    slice.undo();
    expect(getState().columnCardMap["col1"][0]).toBe("card1");
  });

  it("moves the undone action to future", () => {
    const card = makeCard();
    const action: HistoryAction = {
      type: "CREATE_CARD",
      payload: { card, columnId: "col1", index: 0 },
    };
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: { card1: card },
        columnCardMap: { col1: ["card1"], col2: [] },
        past: [action],
      })
    );
    slice.undo();
    expect(getState().future[0]).toEqual(action);
  });

  it("does not use full-state cloning — past stores action payloads not state snapshots", () => {
    const card = makeCard();
    const action: HistoryAction = {
      type: "CREATE_CARD",
      payload: { card, columnId: "col1", index: 0 },
    };
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: { card1: card },
        columnCardMap: { col1: ["card1"], col2: [] },
        past: [action],
      })
    );
    slice.undo();
    // past stores HistoryAction objects, not PersistedState snapshots
    const pastEntry = getState().future[0];
    expect(pastEntry).toHaveProperty("type");
    expect(pastEntry).toHaveProperty("payload");
    expect(pastEntry).not.toHaveProperty("cardsById");
    expect(pastEntry).not.toHaveProperty("columnCardMap");
  });
});

// redo
describe("redo", () => {
  it("does nothing when future is empty", () => {
    const { slice, getState } = makeSlice(makeState());
    slice.redo();
    expect(getState().past).toHaveLength(0);
  });

  it("redoes CREATE_CARD by reinserting the card", () => {
    const card = makeCard();
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: {},
        columnCardMap: { col1: [], col2: [] },
        future: [{
          type: "CREATE_CARD",
          payload: { card, columnId: "col1", index: 0 },
        }],
      })
    );
    slice.redo();
    expect(getState().cardsById["card1"]).toEqual(card);
    expect(getState().columnCardMap["col1"]).toContain("card1");
    expect(getState().future).toHaveLength(0);
    expect(getState().past).toHaveLength(1);
  });

  it("redoes DELETE_CARD by removing the card again", () => {
    const card = makeCard();
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: { card1: card },
        columnCardMap: { col1: ["card1"], col2: [] },
        future: [{
          type: "DELETE_CARD",
          payload: { card, columnId: "col1", index: 0 },
        }],
      })
    );
    slice.redo();
    expect(getState().cardsById["card1"]).toBeUndefined();
    expect(getState().columnCardMap["col1"]).not.toContain("card1");
  });

  it("redoes MOVE_CARD by moving the card to its destination again", () => {
    const card = makeCard({ id: "card1", columnId: "col1" });
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: { card1: card },
        columnCardMap: { col1: ["card1"], col2: [] },
        future: [{
          type: "MOVE_CARD",
          payload: {
            cardId: "card1",
            fromColumnId: "col1",
            toColumnId: "col2",
            fromIndex: 0,
            toIndex: 0,
          },
        }],
      })
    );
    slice.redo();
    expect(getState().columnCardMap["col2"]).toContain("card1");
    expect(getState().columnCardMap["col1"]).not.toContain("card1");
  });

  it("moves the redone action back to past", () => {
    const card = makeCard();
    const action: HistoryAction = {
      type: "CREATE_CARD",
      payload: { card, columnId: "col1", index: 0 },
    };
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: {},
        columnCardMap: { col1: [], col2: [] },
        future: [action],
      })
    );
    slice.redo();
    expect(getState().past[0]).toEqual(action);
  });
});

// undo then redo
describe("undo then redo", () => {
  it("restores card after undo then redo for CREATE_CARD", () => {
    const card = makeCard();
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: { card1: card },
        columnCardMap: { col1: ["card1"], col2: [] },
        past: [{
          type: "CREATE_CARD",
          payload: { card, columnId: "col1", index: 0 },
        }],
      })
    );
    slice.undo();
    expect(getState().cardsById["card1"]).toBeUndefined();
    slice.redo();
    expect(getState().cardsById["card1"]).toEqual(card);
    expect(getState().columnCardMap["col1"]).toContain("card1");
  });

  it("restores card position after undo then redo for MOVE_CARD", () => {
    const card = makeCard({ id: "card1", columnId: "col2" });
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: { card1: card },
        columnCardMap: { col1: [], col2: ["card1"] },
        past: [{
          type: "MOVE_CARD",
          payload: {
            cardId: "card1",
            fromColumnId: "col1",
            toColumnId: "col2",
            fromIndex: 0,
            toIndex: 0,
          },
        }],
      })
    );
    slice.undo();
    expect(getState().columnCardMap["col1"]).toContain("card1");
    slice.redo();
    expect(getState().columnCardMap["col2"]).toContain("card1");
    expect(getState().columnCardMap["col1"]).not.toContain("card1");
  });

  it("new action after undo clears the redo stack", () => {
    const card = makeCard();
    const action: HistoryAction = {
      type: "CREATE_CARD",
      payload: { card, columnId: "col1", index: 0 },
    };
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: { card1: card },
        columnCardMap: { col1: ["card1"], col2: [] },
        past: [action],
      })
    );
    slice.undo();
    expect(getState().future).toHaveLength(1);
    const newAction: HistoryAction = {
      type: "CREATE_CARD",
      payload: { card: makeCard({ id: "card2" }), columnId: "col1", index: 0 },
    };
    slice.pushHistory(newAction);
    expect(getState().future).toHaveLength(0);
  });
});

// index clamping
describe("index clamping in undo/redo", () => {
  it("clamps MOVE_CARD fromIndex during undo if out of bounds", () => {
    const card = makeCard({ id: "card1", columnId: "col2" });
    const card2 = makeCard({ id: "card2", columnId: "col1" });
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: { card1: card, card2 },
        columnCardMap: { col1: ["card2"], col2: ["card1"] },
        past: [{
          type: "MOVE_CARD",
          payload: {
            cardId: "card1",
            fromColumnId: "col1",
            toColumnId: "col2",
            fromIndex: 99,
            toIndex: 0,
          },
        }],
      })
    );
    slice.undo();
    expect(getState().columnCardMap["col1"]).toContain("card1");
  });

  it("clamps MOVE_CARD toIndex during redo if out of bounds", () => {
    const card = makeCard({ id: "card1", columnId: "col1" });
    const card2 = makeCard({ id: "card2", columnId: "col2" });
    const { slice, getState } = makeSlice(
      makeState({
        cardsById: { card1: card, card2 },
        columnCardMap: { col1: ["card1"], col2: ["card2"] },
        future: [{
          type: "MOVE_CARD",
          payload: {
            cardId: "card1",
            fromColumnId: "col1",
            toColumnId: "col2",
            fromIndex: 0,
            toIndex: 99,
          },
        }],
      })
    );
    slice.redo();
    expect(getState().columnCardMap["col2"]).toContain("card1");
  });
});
