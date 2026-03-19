# Performance Benchmarking Notes

## Setup

**Test environment:** MacBook, Chrome 133, React DevTools Profiler  
**Test data:** 21 columns × 10 cards = 210 cards, seeded using the dev-only `seedTestData` utility in the board page  
**Profiling tool:** React DevTools Profiler (Flamegraph and Ranked views)

---

## Baseline Render

Initial mount with 210 cards and 21 columns renders 231 components (210 `CardItem` + 21 `ColumnCard`). Commit time is approximately 45ms on a mid-range laptop. This is within acceptable range for initial load.

---

## Re-render Behaviour Under Mutation

With `memo()` on `CardItem` and `ColumnCard`, and `useShallow` on multi-value Zustand selectors, mutations are surgical — only the affected components re-render.

| Operation | Components re-rendered | Commit time |
|-----------|----------------------|-------------|
| Initial mount (210 cards) | 231 | ~45ms |
| Edit one card | 2 (CardItem + CardModal) | <2ms |
| Move one card (drag end) | 2 (source + destination ColumnCard) | <3ms |
| Add comment | 1 (CommentSection) | <2ms |
| Delete card | 1 (ColumnCard) | <2ms |
| Undo card move | 2 (source + destination ColumnCard) | <2ms |

These results confirm the selector-based architecture is working correctly. Editing a card in Column 1 does not cause Columns 2–21 to re-render. This was verified by checking highlighted components in the React DevTools Profiler flamegraph.

---

## Drag Performance

During active dragging, only two things update per frame:

1. The `DragOverlay` renders a ghost card following the pointer
2. The dragged `CardItem` renders with `opacity: 0.6`

No other components re-render during the drag gesture. `activeDragCardId` state triggers only the `draggingCard` selector recomputation, not a full board re-render. The `PointerSensor` activation constraint (`distance: 5`) prevents accidental drag initiation on clicks.

---

## Comment Section Performance

`CommentThread`, `ReplyItem`, and `CommentItem` are each `memo`-wrapped. Re-renders in the comment section only occur when:

- `cardCommentMap` changes — a new comment is added
- `pendingDeleteId` changes — the delete confirmation modal opens or closes
- `author` changes — the user changes their display name

At typical comment section scale (under 50 comments), re-rendering a few `CommentThread` components on those specific user actions is well within React's performance budget. It would only become a measurable concern above ~200 top-level comments — not a realistic usage pattern.

---

## Known Bottleneck: No List Virtualisation

The primary performance bottleneck at 200+ cards is having all DOM nodes present simultaneously, including those scrolled out of view. The standard fix is list virtualisation with `@tanstack/react-virtual`, which renders only the cards visible in each column's viewport.

**Why virtualisation was not implemented:**

dnd-kit requires all sortable items to be mounted in the DOM to calculate drag positions during a gesture. Virtualising the list means items outside the viewport are unmounted, which breaks dnd-kit's collision detection entirely. This is a known, documented conflict between the two libraries.

**Threshold:** At ~10 cards per column (the Stage 2 target), React handles all DOM nodes without measurable frame drops. The bottleneck would become noticeable above ~50 cards per column.

**Long-term solution:** `pragmatic-drag-and-drop` by Atlassian (used in production Jira) is specifically designed to work alongside virtualised lists. It would be the correct replacement if card counts grow to the point where virtualisation becomes necessary.

---

## Optimisations Applied

| Optimisation | Where | Effect |
|-------------|-------|--------|
| `memo()` | `CardItem`, `ColumnCard`, `CommentThread`, `ReplyItem`, `CommentItem` | Prevents re-renders when props haven't changed |
| `useShallow` | All multi-value Zustand selectors | Prevents re-renders when selector output is shallowly equal |
| `useCallback` | All event handlers in `BoardPage` and `CommentSection` | Stable function references — memo on children is meaningful |
| Normalised state | `cardsById`, `commentsById`, `columnCardMap` etc. | O(1) lookups, minimal object cloning on mutation |
| `partialize` in persist | `store.ts` | Excludes visual state (`activeCardId`) from localStorage serialisation |
| Hydration guard | `BoardPage`, `EntryRoute` | Prevents flash of incorrect UI before localStorage hydrates |