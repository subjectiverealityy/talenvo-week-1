# Performance Benchmarking Notes

## Stage 2 Requirement
"Your board must remain responsive with 200+ cards, 20+ columns, and active comment threads."

## Setup

**Test environment:** Chrome, React DevTools Profiler  
**Test data:** 21 columns × 10 cards = 210 cards, seeded using the dev-only `seedTestData` utility in the board page  
**Profiling tool:** React DevTools Profiler (Flamegraph and Ranked views)

---

## Re-render Behaviour Under Mutation

With `memo()` on `CardItem` and `ColumnCard`, and `useShallow` on multi-value Zustand selectors, only the affected components re-render. The `✨` symbol in React DevTools confirms `memo()` is active and working on all key components.

| Operation | Key components re-rendered | Commit time |
|-----------|---------------------------|-------------|
| Open card modal | `CardModal`, `BoardPage`, `CommentSection` | ~6ms |
| Add / submit comment | `CommentSection`, `CommentItem`, `CommentThread` | ~9ms |
| Add reply to comment | `CommentThread`, `CommentItem`, `ReplyItem` | ~6ms |
| Single card interaction (move + toast) | `BoardPage`, `DndContext`, 2× `ColumnCard`, `ToastItem` | ~11ms |
| Active drag (mid-gesture) | Multiple `ColumnCard` + `CardItem`, `AnimationManager` | ~35ms |
| Drag end (card move finalised) | `BoardPage`, `DndContext`, multiple `ColumnCard` + `CardItem` | ~51–55ms |

---

### Profiler Screenshots

![Card modal opened](../assets/card-modal-opened.png)
![Comment added](../assets/comment-added.png)
![Reply added](../assets/reply-added.png)
![Reply added — with details](../assets/reply-added-details.png)

---

## Card Modal Performance

Opening the card modal takes two commits:

**Commit 1 (~6ms):** `DndContext` updates as the board loses pointer focus. Fast at 5.8ms render time.

**Commit 2 (~6ms):** `BoardPage` triggers the modal mount. `CardModal` (2.5ms) and `CommentSection` (0.9ms) mount together. Total render: 6.2ms. The board behind the modal does not re-render - only `CardModal`, `BoardPage`, and `CommentSection` appear in the Ranked view.

---

## Comment System Performance

**Submitting a comment (~9ms):** `CommentInput` triggers a `CommentSection` re-render (5.2ms). `CommentItem` (1.8ms) and `CommentThread` mount for the new comment. Total render: 8.7ms. No board components re-render - the update is fully scoped to the comment tree.

**Adding a reply (~6ms):** `CommentThread` re-renders (1.3ms) as its `replyIds` array grows by one, `CommentItem` (3ms) re-renders as the parent, and `ReplyItem` mounts for the new reply. Total render: 6ms. The `memo()` on `CommentItem`, `CommentThread`, and `ReplyItem` is functional - only the targeted comment re-renders, not the entire comment list.

---

## Drag Performance Analysis

Three commit types were observed during drag operations:

**Mid-drag (~35ms):** During an active drag gesture, dnd-kit recalculates transform positions across the board on every pointer move. `AnimationManager` appears in the Ranked view confirming that this is a live drag update. More columns and cards re-render because dnd-kit needs positional data from all sortable items.

**Drag end (~51–55ms):** These are the most expensive commits. dnd-kit finalises positions, updates `SortableContext` across multiple columns, and `AnimationManager` cleans up. `BoardPage` (6ms) and `DndContext` (2–3ms) account for the largest share of time. Individual `ColumnCard` and `CardItem` renders are 0.2–2.7ms each.

**Post-move toast (~11ms):** After drag end, a separate commit applies the state update and fires the toast notification. `ToastProvider` and `ToastItem` appear alongside the two affected `ColumnCard`s. Only the source and destination columns re-render - the other 19 columns do not re-render.

All operations remain well under 60ms with 210 cards across 21 columns.

---

## Selector Efficiency

The `useShallow` selector on `ColumnCard` correctly scopes re-renders to the affected column. When a card is moved from Column A to Column B, only those two `ColumnCard` instances appear in the Ranked view - the remaining 19 columns show as grey (did not render) in the Flamegraph. This confirms the normalised state shape and `useShallow` are functioning correctly.

Comment re-renders are similarly scoped - submitting a comment does not trigger any board-level re-renders. The comment tree is fully isolated from the board state.

---

## Known Bottleneck: No List Virtualisation

The primary performance bottleneck at higher card counts is having all DOM nodes present simultaneously, including those scrolled out of view. The standard fix is list virtualisation with `@tanstack/react-virtual`, an industry standard library for virtualisation (just like `dnd-kit` for drag and drop), which renders only the cards visible in each column's viewport.

**Why virtualisation was not implemented:**

dnd-kit requires all sortable items to be mounted in the DOM to calculate drag positions during a gesture. Virtualising the list means items outside the viewport are unmounted, which breaks dnd-kit's collision detection entirely. This is a known, documented conflict between the two libraries.

**Threshold:** At 200+ cards, 20+ columns, and active comment threads (the Stage 2 Performance Stress Test responsiveness requirement), React handles all DOM nodes without measurable frame drops. The 35–55ms drag commits are driven by dnd-kit's position reconciliation logic, not DOM size. The bottleneck would become noticeable above ~50 cards per column.

**Long-term solution:** `pragmatic-drag-and-drop` by Atlassian (used in production Jira) is specifically designed to work alongside virtualised lists. It would be the correct replacement if card counts grow to the point where virtualisation becomes necessary.

---

## Optimisations Applied

| Optimisation | Where | Effect |
|-------------|-------|--------|
| `memo()` | `CardItem`, `ColumnCard`, `CommentThread`, `ReplyItem`, `CommentItem` | Prevents re-renders when props haven't changed - confirmed by `✨` in React DevTools |
| `useShallow` | All multi-value Zustand selectors | Prevents re-renders when selector output is shallowly equal - only affected columns re-render on card move |
| `useCallback` | All event handlers in `BoardPage` and `CommentSection` | Stable function references - memo on children is meaningful |
| Normalised state | `cardsById`, `commentsById`, `columnCardMap` etc. | O(1) lookups, minimal object cloning on mutation |
| `partialize` in persist | `store.ts` | Excludes visual state from localStorage serialisation |
| Hydration guard | `BoardPage`, `EntryRoute` | Prevents flash of incorrect UI before localStorage hydrates |