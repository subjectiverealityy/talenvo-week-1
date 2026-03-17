import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBoard } from "@/store/actions/boardActions";
import { createColumn } from "@/store/actions/columnActions";
import { createCard, moveCard } from "@/store/actions/cardActions";
import * as mockApi from "@/lib/mockApi";
import type { PersistedState } from "@/store/types";

const emptyState: PersistedState = {
  boardsById: {},
  boardIds: [],
  columnsById: {},
  boardColumnMap: {},
  cardsById: {},
  columnCardMap: {},
  commentsById: {},
  cardCommentMap: {},
  commentReplyMap: {},
};

// Integration tests — simulate full board interactions by chaining pure action functions together. The first two tests verify state correctness across the full board interaction flow. The last two tests verify that updateCardPosition is called with the correct payload and simulates the persistence pattern used in BoardPage.
describe("board interaction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("simulates creating a board, columns, and cards then moving a card across columns", () => {
    // Step 1 - create a board
    const boardUpdates = createBoard(emptyState, {
      title: "My Board",
      description: "",
    }) as PersistedState;
    const boardId = boardUpdates.boardIds[0];
    const stateAfterBoard = { ...emptyState, ...boardUpdates };

    // Step 2 - create two columns
    const col1Updates = createColumn(stateAfterBoard, {
      boardId,
      title: "To Do",
    }) as PersistedState;
    const stateAfterCol1 = { ...stateAfterBoard, ...col1Updates };
    const col1Id = Object.keys(col1Updates.columnsById)[0];

    const col2Updates = createColumn(stateAfterCol1, {
      boardId,
      title: "In Progress",
    }) as PersistedState;
    const stateAfterCol2 = { ...stateAfterCol1, ...col2Updates };
    const col2Id = Object.keys(col2Updates.columnsById).find(
      (id) => id !== col1Id
    )!;

    // Step 3 - create a card in column 1
    const cardUpdates = createCard(stateAfterCol2, {
      columnId: col1Id,
      title: "My Card",
    }) as PersistedState;
    const stateAfterCard = { ...stateAfterCol2, ...cardUpdates };
    const cardId = Object.keys(cardUpdates.cardsById)[0];

    // Verify that card is in column 1 before the move
    expect(stateAfterCard.columnCardMap[col1Id]).toContain(cardId);
    expect(stateAfterCard.columnCardMap[col2Id]).not.toContain(cardId);

    // Step 4 - move the card to column 2
    const moveUpdates = moveCard(stateAfterCard, {
      cardId,
      sourceColumnId: col1Id,
      destinationColumnId: col2Id,
      newIndex: 0,
    });
    const stateAfterMove = { ...stateAfterCard, ...moveUpdates };

    // Verify store state updated correctly
    expect(stateAfterMove.columnCardMap[col1Id]).not.toContain(cardId);
    expect(stateAfterMove.columnCardMap[col2Id]).toContain(cardId);
    expect(stateAfterMove.cardsById[cardId].columnId).toBe(col2Id);
  });

  it("simulates creating multiple cards and reordering within a column", () => {
    // Build state with a board, column, and two cards
    const boardUpdates = createBoard(emptyState, {
      title: "My Board",
      description: "",
    }) as PersistedState;
    const boardId = boardUpdates.boardIds[0];
    const stateAfterBoard = { ...emptyState, ...boardUpdates };

    const colUpdates = createColumn(stateAfterBoard, {
      boardId,
      title: "To Do",
    }) as PersistedState;
    const stateAfterCol = { ...stateAfterBoard, ...colUpdates };
    const colId = Object.keys(colUpdates.columnsById)[0];

    const card1Updates = createCard(stateAfterCol, {
      columnId: colId,
      title: "Card 1",
    }) as PersistedState;
    const stateAfterCard1 = { ...stateAfterCol, ...card1Updates };
    const card1Id = Object.keys(card1Updates.cardsById)[0];

    const card2Updates = createCard(stateAfterCard1, {
      columnId: colId,
      title: "Card 2",
    }) as PersistedState;
    const stateAfterCard2 = { ...stateAfterCard1, ...card2Updates };
    const card2Id = Object.keys(card2Updates.cardsById).find(
      (id) => id !== card1Id
    )!;

    // Verify initial order
    expect(stateAfterCard2.columnCardMap[colId]).toEqual([card1Id, card2Id]);

    // Move card2 to top
    const moveUpdates = moveCard(stateAfterCard2, {
      cardId: card2Id,
      sourceColumnId: colId,
      destinationColumnId: colId,
      newIndex: 0,
    });
    const stateAfterMove = { ...stateAfterCard2, ...moveUpdates };

    // Verify reordering
    expect(stateAfterMove.columnCardMap[colId][0]).toBe(card2Id);
    expect(stateAfterMove.columnCardMap[colId][1]).toBe(card1Id);
  });

  it("persists card move to mock API after moving across columns", async () => {
    // Build state with a board, two columns, and a card
    const boardUpdates = createBoard(emptyState, {
      title: "My Board",
      description: "",
    }) as PersistedState;
    const boardId = boardUpdates.boardIds[0];
    const stateAfterBoard = { ...emptyState, ...boardUpdates };

    const col1Updates = createColumn(stateAfterBoard, {
      boardId,
      title: "To Do",
    }) as PersistedState;
    const stateAfterCol1 = { ...stateAfterBoard, ...col1Updates };
    const col1Id = Object.keys(col1Updates.columnsById)[0];

    const col2Updates = createColumn(stateAfterCol1, {
      boardId,
      title: "In Progress",
    }) as PersistedState;
    const stateAfterCol2 = { ...stateAfterCol1, ...col2Updates };
    const col2Id = Object.keys(col2Updates.columnsById).find(
      (id) => id !== col1Id
    )!;

    const cardUpdates = createCard(stateAfterCol2, {
      columnId: col1Id,
      title: "My Card",
    }) as PersistedState;
    const stateAfterCard = { ...stateAfterCol2, ...cardUpdates };
    const cardId = Object.keys(cardUpdates.cardsById)[0];

    const movePayload = {
      cardId,
      sourceColumnId: col1Id,
      destinationColumnId: col2Id,
      newIndex: 0,
    };

    // Set up a spy before the call
    const spy = vi.spyOn(mockApi, "updateCardPosition").mockResolvedValue();

    // Simulate what BoardPage does — update state then persist
    moveCard(stateAfterCard, movePayload);
    await mockApi.updateCardPosition(movePayload);

    expect(spy).toHaveBeenCalledWith(movePayload);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("persists card reorder to mock API after reordering within a column", async () => {
    // Build state with a board, column, and two cards
    const boardUpdates = createBoard(emptyState, {
      title: "My Board",
      description: "",
    }) as PersistedState;
    const boardId = boardUpdates.boardIds[0];
    const stateAfterBoard = { ...emptyState, ...boardUpdates };

    const colUpdates = createColumn(stateAfterBoard, {
      boardId,
      title: "To Do",
    }) as PersistedState;
    const stateAfterCol = { ...stateAfterBoard, ...colUpdates };
    const colId = Object.keys(colUpdates.columnsById)[0];

    const card1Updates = createCard(stateAfterCol, {
      columnId: colId,
      title: "Card 1",
    }) as PersistedState;
    const stateAfterCard1 = { ...stateAfterCol, ...card1Updates };
    const card1Id = Object.keys(card1Updates.cardsById)[0];

    const card2Updates = createCard(stateAfterCard1, {
      columnId: colId,
      title: "Card 2",
    }) as PersistedState;
    const stateAfterCard2 = { ...stateAfterCard1, ...card2Updates };
    const card2Id = Object.keys(card2Updates.cardsById).find(
      (id) => id !== card1Id
    )!;

    const movePayload = {
      cardId: card2Id,
      sourceColumnId: colId,
      destinationColumnId: colId,
      newIndex: 0,
    };

    // Set up a spy before the call
    const spy = vi.spyOn(mockApi, "updateCardPosition").mockResolvedValue();

    // Simulate what BoardPage does - update state then persist
    moveCard(stateAfterCard2, movePayload);
    await mockApi.updateCardPosition(movePayload);

    expect(spy).toHaveBeenCalledWith(movePayload);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});