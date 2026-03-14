import { describe, it, expect } from "vitest";
import { createCard, editCard, deleteCard, moveCard } from "@/store/actions/cardActions";
import { createBoard } from "@/store/actions/boardActions";
import { createColumn } from "@/store/actions/columnActions";
import type { PersistedState } from "@/store/types";

const emptyState: PersistedState = {
  boardsById: {},
  boardIds: [],
  columnsById: {},
  boardColumnMap: {},
  cardsById: {},
  columnCardMap: {},
};

// Creates a state with a single board and a column that is ready to receive cards
function stateWithColumn(): { state: PersistedState; boardId: string; columnId: string } {
  const boardState = { ...emptyState, ...createBoard(emptyState, { title: "My Board", description: "" }) } as PersistedState;
  const boardId = boardState.boardIds[0];
  const columnState = { ...boardState, ...createColumn(boardState, { boardId, title: "My Column" }) } as PersistedState;
  const columnId = Object.keys(columnState.columnsById)[0];
  return { state: columnState, boardId, columnId };
}

describe("createCard", () => {
  it("creates a card with a valid title", () => {
    const { state, columnId } = stateWithColumn();
    const result = createCard(state, { columnId, title: "My Card" });
    expect(Object.keys(result.cardsById!)).toHaveLength(1);
  });

  it("sets the correct title and columnId", () => {
    const { state, columnId } = stateWithColumn();
    const result = createCard(state, { columnId, title: "My Card" });
    const cardId = Object.keys(result.cardsById!)[0];
    expect(result.cardsById![cardId].title).toBe("My Card");
    expect(result.cardsById![cardId].columnId).toBe(columnId);
  });

  it("adds card id to columnCardMap", () => {
    const { state, columnId } = stateWithColumn();
    const result = createCard(state, { columnId, title: "My Card" });
    const cardId = Object.keys(result.cardsById!)[0];
    expect(result.columnCardMap![columnId]).toContain(cardId);
  });

  it("sets default values for optional fields", () => {
    const { state, columnId } = stateWithColumn();
    const result = createCard(state, { columnId, title: "My Card" });
    const cardId = Object.keys(result.cardsById!)[0];
    expect(result.cardsById![cardId].description).toBe("");
    expect(result.cardsById![cardId].tags).toEqual([]);
    expect(result.cardsById![cardId].dueDate).toBeNull();
  });

  it("returns empty object if title is empty", () => {
    const { state, columnId } = stateWithColumn();
    const result = createCard(state, { columnId, title: "" });
    expect(result).toEqual({});
  });

  it("returns empty object if column does not exist", () => {
    const result = createCard(emptyState, { columnId: "nonexistent", title: "My Card" });
    expect(result).toEqual({});
  });
});

describe("editCard", () => {
  it("updates card title", () => {
    const { state, columnId } = stateWithColumn();
    const created = createCard(state, { columnId, title: "Old Title" }) as PersistedState;
    const cardId = Object.keys(created.cardsById)[0];
    const result = editCard(created, { cardId, updates: { title: "New Title" } });
    expect(result.cardsById![cardId].title).toBe("New Title");
  });

  it("preserves other fields when editing title only", () => {
    const { state, columnId } = stateWithColumn();
    const created = createCard(state, { columnId, title: "My Card", description: "Keep this" }) as PersistedState;
    const cardId = Object.keys(created.cardsById)[0];
    const result = editCard(created, { cardId, updates: { title: "New Title" } });
    expect(result.cardsById![cardId].description).toBe("Keep this");
  });

  it("returns empty object if card does not exist", () => {
    const result = editCard(emptyState, { cardId: "nonexistent", updates: { title: "Title" } });
    expect(result).toEqual({});
  });
});

describe("deleteCard", () => {
  it("removes card from cardsById", () => {
    const { state, columnId } = stateWithColumn();
    const created = createCard(state, { columnId, title: "My Card" }) as PersistedState;
    const cardId = Object.keys(created.cardsById)[0];
    const result = deleteCard(created, { cardId });
    expect(result.cardsById![cardId]).toBeUndefined();
  });

  it("removes card from columnCardMap", () => {
    const { state, columnId } = stateWithColumn();
    const created = createCard(state, { columnId, title: "My Card" }) as PersistedState;
    const cardId = Object.keys(created.cardsById)[0];
    const result = deleteCard(created, { cardId });
    expect(result.columnCardMap![columnId]).not.toContain(cardId);
  });

  it("returns empty object if card does not exist", () => {
    const result = deleteCard(emptyState, { cardId: "nonexistent" });
    expect(result).toEqual({});
  });
});

describe("moveCard", () => {
  it("moves card to a different column", () => {
    const { state, boardId, columnId: sourceColumnId } = stateWithColumn();
    const secondColumn = createColumn(state, { boardId, title: "Second Column" }) as PersistedState;
    const destinationColumnId = Object.keys(secondColumn.columnsById).find(
      (id) => id !== sourceColumnId
    )!;
    const mergedState = { ...state, ...secondColumn };
    const withCard = createCard(mergedState, { columnId: sourceColumnId, title: "My Card" }) as PersistedState;
    const cardId = Object.keys(withCard.cardsById)[0];
    const fullState = { ...mergedState, ...withCard };

    const result = moveCard(fullState, {
      cardId,
      sourceColumnId,
      destinationColumnId,
      newIndex: 0,
    });

    expect(result.columnCardMap![sourceColumnId]).not.toContain(cardId);
    expect(result.columnCardMap![destinationColumnId]).toContain(cardId);
    expect(result.cardsById![cardId].columnId).toBe(destinationColumnId);
  });

  it("reorders card within the same column", () => {
    const { state, columnId } = stateWithColumn();
    const withCard1 = createCard(state, { columnId, title: "Card 1" }) as PersistedState;
    const card1Id = Object.keys(withCard1.cardsById)[0];
    const stateAfterCard1 = { ...state, ...withCard1 };
    const withCard2 = createCard(stateAfterCard1, { columnId, title: "Card 2" }) as PersistedState;
    const card2Id = Object.keys(withCard2.cardsById).find((id) => id !== card1Id)!;
    const fullState = { ...stateAfterCard1, ...withCard2 };

    const result = moveCard(fullState, {
      cardId: card2Id,
      sourceColumnId: columnId,
      destinationColumnId: columnId,
      newIndex: 0,
    });

    expect(result.columnCardMap![columnId][0]).toBe(card2Id);
    expect(result.cardsById).toBe(fullState.cardsById); // They have the same reference (there is no unnecessary object creation).
  });

  it("returns empty object if card does not exist", () => {
    const result = moveCard(emptyState, {
      cardId: "nonexistent",
      sourceColumnId: "col1",
      destinationColumnId: "col2",
      newIndex: 0,
    });
    expect(result).toEqual({});
  });
});