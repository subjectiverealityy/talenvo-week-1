import { describe, it, expect } from "vitest";
import { moveCard } from "@/store/actions/cardActions";
import type { PersistedState } from "@/store/types";

function makeState(overrides: Partial<PersistedState> = {}): PersistedState {
  return {
    boardsById: {},
    boardIds: [],
    columnsById: {
      col1: { id: "col1", title: "Column 1", boardId: "board1" },
      col2: { id: "col2", title: "Column 2", boardId: "board1" },
      col3: { id: "col3", title: "Column 3", boardId: "board1" },
    },
    boardColumnMap: { board1: ["col1", "col2", "col3"] },
    cardsById: {},
    columnCardMap: { col1: [], col2: [], col3: [] },
    commentsById: {},
    cardCommentMap: {},
    commentReplyMap: {},
    ...overrides,
  };
}

function makeCard(id: string, columnId: string) {
  return {
    id,
    title: `Card ${id}`,
    description: "",
    tags: [],
    dueDate: null,
    columnId,
  };
}

// Moving cards across columns
describe("moving a card to a different column", () => {
  it("removes card from source column", () => {
    const state = makeState({
      cardsById: { card1: makeCard("card1", "col1") },
      columnCardMap: { col1: ["card1"], col2: [], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card1",
      sourceColumnId: "col1",
      destinationColumnId: "col2",
      newIndex: 0,
    });

    expect(result.columnCardMap!["col1"]).not.toContain("card1");
  });

  it("adds card to destination column at correct index", () => {
    const state = makeState({
      cardsById: { card1: makeCard("card1", "col1") },
      columnCardMap: { col1: ["card1"], col2: [], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card1",
      sourceColumnId: "col1",
      destinationColumnId: "col2",
      newIndex: 0,
    });

    expect(result.columnCardMap!["col2"][0]).toBe("card1");
  });

  it("updates card's columnId to destination column", () => {
    const state = makeState({
      cardsById: { card1: makeCard("card1", "col1") },
      columnCardMap: { col1: ["card1"], col2: [], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card1",
      sourceColumnId: "col1",
      destinationColumnId: "col2",
      newIndex: 0,
    });

    expect(result.cardsById!["card1"].columnId).toBe("col2");
  });

  it("inserts card at correct index when destination column has existing cards", () => {
    const state = makeState({
      cardsById: {
        card1: makeCard("card1", "col1"),
        card2: makeCard("card2", "col2"),
        card3: makeCard("card3", "col2"),
      },
      columnCardMap: { col1: ["card1"], col2: ["card2", "card3"], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card1",
      sourceColumnId: "col1",
      destinationColumnId: "col2",
      newIndex: 1,
    });

    expect(result.columnCardMap!["col2"]).toEqual(["card2", "card1", "card3"]);
  });

  it("does not affect other columns when moving a card", () => {
    const state = makeState({
      cardsById: {
        card1: makeCard("card1", "col1"),
        card2: makeCard("card2", "col3"),
      },
      columnCardMap: { col1: ["card1"], col2: [], col3: ["card2"] },
    });

    const result = moveCard(state, {
      cardId: "card1",
      sourceColumnId: "col1",
      destinationColumnId: "col2",
      newIndex: 0,
    });

    expect(result.columnCardMap!["col3"]).toEqual(["card2"]);
  });
});

// Reordering within a column
describe("reordering a card within the same column", () => {
  it("moves card from bottom to top", () => {
    const state = makeState({
      cardsById: {
        card1: makeCard("card1", "col1"),
        card2: makeCard("card2", "col1"),
        card3: makeCard("card3", "col1"),
      },
      columnCardMap: { col1: ["card1", "card2", "card3"], col2: [], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card3",
      sourceColumnId: "col1",
      destinationColumnId: "col1",
      newIndex: 0,
    });

    expect(result.columnCardMap!["col1"]).toEqual(["card3", "card1", "card2"]);
  });

  it("moves card from top to bottom", () => {
    const state = makeState({
      cardsById: {
        card1: makeCard("card1", "col1"),
        card2: makeCard("card2", "col1"),
        card3: makeCard("card3", "col1"),
      },
      columnCardMap: { col1: ["card1", "card2", "card3"], col2: [], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card1",
      sourceColumnId: "col1",
      destinationColumnId: "col1",
      newIndex: 2,
    });

    expect(result.columnCardMap!["col1"]).toEqual(["card2", "card3", "card1"]);
  });

  it("does not change order when dropped in same position", () => {
    const state = makeState({
      cardsById: {
        card1: makeCard("card1", "col1"),
        card2: makeCard("card2", "col1"),
      },
      columnCardMap: { col1: ["card1", "card2"], col2: [], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card1",
      sourceColumnId: "col1",
      destinationColumnId: "col1",
      newIndex: 0,
    });

    expect(result.columnCardMap!["col1"]).toEqual(["card1", "card2"]);
  });

  it("does not update columnId when reordering within same column", () => {
    const state = makeState({
      cardsById: {
        card1: makeCard("card1", "col1"),
        card2: makeCard("card2", "col1"),
      },
      columnCardMap: { col1: ["card1", "card2"], col2: [], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card2",
      sourceColumnId: "col1",
      destinationColumnId: "col1",
      newIndex: 0,
    });

    expect(result.cardsById!["card2"].columnId).toBe("col1");
  });

  it("does not create a new cardsById object when moving within same column", () => {
    const state = makeState({
      cardsById: {
        card1: makeCard("card1", "col1"),
        card2: makeCard("card2", "col1"),
      },
      columnCardMap: { col1: ["card1", "card2"], col2: [], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card2",
      sourceColumnId: "col1",
      destinationColumnId: "col1",
      newIndex: 0,
    });

    expect(result.cardsById).toBe(state.cardsById);
  });
});

// Index clamping
describe("index clamping", () => {
  it("clamps newIndex to 0 if negative", () => {
    const state = makeState({
      cardsById: {
        card1: makeCard("card1", "col1"),
        card2: makeCard("card2", "col2"),
      },
      columnCardMap: { col1: ["card1"], col2: ["card2"], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card1",
      sourceColumnId: "col1",
      destinationColumnId: "col2",
      newIndex: -5,
    });

    expect(result.columnCardMap!["col2"][0]).toBe("card1");
  });

  it("clamps newIndex to end of list if out of bounds", () => {
    const state = makeState({
      cardsById: {
        card1: makeCard("card1", "col1"),
        card2: makeCard("card2", "col2"),
      },
      columnCardMap: { col1: ["card1"], col2: ["card2"], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card1",
      sourceColumnId: "col1",
      destinationColumnId: "col2",
      newIndex: 99,
    });

    expect(result.columnCardMap!["col2"]).toEqual(["card2", "card1"]);
  });
});

// Guards
describe("guards", () => {
  it("returns empty object if card does not exist", () => {
    const state = makeState();
    const result = moveCard(state, {
      cardId: "nonexistent",
      sourceColumnId: "col1",
      destinationColumnId: "col2",
      newIndex: 0,
    });
    expect(result).toEqual({});
  });

  it("returns empty object if source column does not exist", () => {
    const state = makeState({
      cardsById: { card1: makeCard("card1", "col1") },
      columnCardMap: { col1: ["card1"], col2: [], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card1",
      sourceColumnId: "nonexistent",
      destinationColumnId: "col2",
      newIndex: 0,
    });

    expect(result).toEqual({});
  });

  it("returns empty object if destination column does not exist", () => {
    const state = makeState({
      cardsById: { card1: makeCard("card1", "col1") },
      columnCardMap: { col1: ["card1"], col2: [], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card1",
      sourceColumnId: "col1",
      destinationColumnId: "nonexistent",
      newIndex: 0,
    });

    expect(result).toEqual({});
  });
});

// Ordering persistence
describe("ordering persistence", () => {
  it("preserves order of remaining cards in source column after move", () => {
    const state = makeState({
      cardsById: {
        card1: makeCard("card1", "col1"),
        card2: makeCard("card2", "col1"),
        card3: makeCard("card3", "col1"),
      },
      columnCardMap: { col1: ["card1", "card2", "card3"], col2: [], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card2",
      sourceColumnId: "col1",
      destinationColumnId: "col2",
      newIndex: 0,
    });

    expect(result.columnCardMap!["col1"]).toEqual(["card1", "card3"]);
  });

  it("preserves order of existing cards in destination column after move", () => {
    const state = makeState({
      cardsById: {
        card1: makeCard("card1", "col1"),
        card2: makeCard("card2", "col2"),
        card3: makeCard("card3", "col2"),
      },
      columnCardMap: { col1: ["card1"], col2: ["card2", "card3"], col3: [] },
    });

    const result = moveCard(state, {
      cardId: "card1",
      sourceColumnId: "col1",
      destinationColumnId: "col2",
      newIndex: 2,
    });

    expect(result.columnCardMap!["col2"]).toEqual(["card2", "card3", "card1"]);
  });
});
