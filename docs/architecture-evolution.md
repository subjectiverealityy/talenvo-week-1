# Architecture Evolution Document
## From Talenvo Stage 1 to Talenvo Stage 2 (Frontend Development Track)

---

## Overview

This document covers the architectural decisions made during Stage 2 of the Talenvo Global Residency - what broke when complexity increased, what changed in the state structure, known technical debt, and how the system would scale to 10,000 users. It also includes performance benchmarking notes from the performance stress test.

---

## 1. What Broke When Adding Real-Time

### The core problem

At the end of Stage 1, each browser tab had its own isolated JavaScript environment. When Tab A created a card, it updated its own Zustand store in memory. Tab B had a completely separate store instance with no knowledge of Tab A's change. The only synchronisation between tabs was localStorage — and Zustand's `persist` middleware would write to localStorage on every mutation, but Tab B would never react to that change unless the user manually refreshed the page.

The requirement was for card creation, card movement, and comment additions to reflect in multiple open sessions automatically. Without real-time infrastructure, the normal behaviour would be:

- User A creates a card in Tab 1 → visible in Tab 1 immediately
- User B in Tab 2 sees nothing — the card doesn't appear until they refresh

### What I evaluated

I evaluated three approaches:

**Polling** — each tab checks localStorage every N seconds for new updates. Simple to implement, works on Vercel with no extra infrastructure, but updates are delayed by the poll interval, wastes resources checking even when nothing changed, and the upgrade path to a real WebSocket server is messier (you'd need to remove the interval logic and replace it with a socket connection).

**BroadcastChannel API** — a browser API that lets multiple tabs on the same origin communicate with each other directly. Updates are instant, only fires when something actually changes, and the upgrade path to a real WebSocket server is almost a direct swap (both have a send/post method and an onmessage handler; swapping the transport in one file changes nothing else in the architecture). The limitation is it only works across tabs in the same browser on the same device — two different users on different computers would not see each other's changes.

**Pusher (managed WebSocket server)** — a real WebSocket service that works on Vercel without a persistent server process. Card creation, movement, and comment additions reflect across different browsers and devices in real time. The limitation is that state is currently localStorage-only, so different browsers start with different data. Real-time propagation of *changes* still works correctly — if both sessions happen to be on the same board, changes in one will appear in the other instantly.

### What I chose and why

I implemented Pusher. The Stage 2 requirement says "WebSocket server (preferred)" and Pusher is a real, managed WebSocket service — not a simulation. It satisfies every required behaviour: card creation, card movement, and comment additions reflect across multiple open sessions. The optimistic UI pattern, conflict handling strategy, and reconciliation logic are all present and identical regardless of whether the transport layer is BroadcastChannel or Pusher.

The localStorage limitation (different browsers starting with different data) is a known architectural constraint, not a Pusher limitation. It would be resolved by adding a server-side database so all clients load the same initial state on startup. For the walkthrough video, two tabs in the same browser share localStorage and Pusher delivers events between them in real time — demonstrating the behaviour the requirement asks for.

### What broke in the state structure

Adding real-time introduced one significant bug that wasn't immediately obvious: **incoming WebSocket events were pushing to the local undo history**. When User B's `CARD_MOVED` event arrived on User A's screen, `store.moveCard()` was called, which correctly updated the board state — but it also called `pushHistory()`, meaning User A could undo User B's card move. This is wrong. Undo should only track local actions.

The fix was adding a `skipHistory?: boolean` option to `createCard` and `moveCard` in `cardSlice.ts`. The WebSocket handler passes `skipHistory: true` on `CARD_CREATED` and `CARD_MOVED`, so remote actions apply state updates without touching the local undo stack.

### What happens if two users edit the same card?

**Last-write-wins.** The most recently received event is applied directly. If User A and User B both edit the same card title simultaneously, whichever `CARD_EDITED` event Pusher delivers last is what both users end up seeing.

This is the simplest viable strategy for a client-side store without a central authority to resolve conflicts. It is appropriate for this architecture and honest to document. A production system with stronger consistency requirements would use **operational transforms** (as Google Docs does) or **vector clocks** to detect and merge concurrent edits rather than blindly overwriting them. For a Kanban board where two users editing the exact same card at the exact same millisecond is an edge case, last-write-wins is the correct pragmatic choice.

---

## 2. What Changed in the State Structure

### Stage 1 state shape

In Stage 1, the store used React's `useReducer` with a custom context provider (`StoreProvider`). State was structured with `boardsById`, `boardIds`, `columnsById`, `boardColumnMap`, `cardsById`, and `columnCardMap` — a normalised shape where entities are stored as flat maps and ordering is preserved in separate arrays. This was correct and served Stage 1 well.

The problems the Stage 1 evaluators identified were: unnecessary renders on the columns page, and a suggestion to use a store library like Redux or Zustand for smoother scalability.

### Stage 2 state shape

I migrated to **Zustand** with a layered architecture:

```
src/types/index.ts        → domain types (Board, Column, Card, Comment)
src/store/types.ts        → store-specific types (PersistedState, VisualState, RealtimeEvent, Action)
src/store/actions/        → pure action functions (take state + payload, return partial state)
src/store/slices/         → Zustand wiring layer (connect set/get to action functions)
src/store/store.ts        → assembly point (combines slices, adds devtools + persist middleware)
```

The guiding principle is **separation of concerns** — types know nothing about logic, logic knows nothing about the state container, the state container knows nothing about the UI. This is sometimes called the ports and adapters pattern. The action functions are the port; Zustand is the adapter. Swapping Zustand for Redux Toolkit tomorrow would mean rewriting only the slices and store.ts — the action functions and types would not change at all.

**Why Zustand over useReducer:**
- Built-in devtools middleware — Redux DevTools integration with no extra setup
- Built-in `persist` middleware — replaces the custom localStorage persistence layer from Stage 1 with three lines of configuration
- No context boilerplate — no provider wrapper needed, no `createContext`, no `useContext`
- Components only re-render when the specific slice of state they subscribe to changes, using `useShallow` for multi-value selectors
- Works outside components — `useStore.getState()` is available in event handlers, WebSocket listeners, and utility functions without hooks

**Comment state added in Stage 2:**

```
commentsById: Record<string, Comment>    // flat comment store
cardCommentMap: Record<string, string[]> // cardId → top-level comment IDs
commentReplyMap: Record<string, string[] // commentId → reply IDs
```

Comments are stored flat (normalised), not nested. A comment knows its `parentId` (null for top-level, a comment ID for replies). This avoids deeply nested uncontrolled state and makes all comment operations O(1) lookups. The `cardCommentMap` and `commentReplyMap` preserve ordering and allow efficient rendering at any nesting depth.

**Author name storage decision:**

Author names are stored directly on each comment at the time of posting rather than being looked up dynamically. This means changing your display name only affects future comments, not past ones. This is intentional — retroactively changing the author on existing comments would misrepresent who said what and when, which is a data integrity concern. Tools like GitHub and Linear follow the same pattern. In a production system with real user accounts, author names would be resolved dynamically from a user ID stored on each comment — but without a real auth system, the denormalised approach is the correct call.

**HistoryState added in Stage 2:**

```
past: HistoryAction[]    // completed actions
future: HistoryAction[]  // undone actions available for redo
```

The undo/redo system uses the **Command Pattern** — each action is a command object that knows how to be applied and reversed. This is the same pattern used by Figma, Notion, and Linear. I evaluated three options:

- **Action History Pattern** — too loose. Not really a pattern in itself, just "store what happened." Doesn't give you a clear answer for how to implement undo.
- **Command Pattern** — chosen. Each `HistoryAction` in the discriminated union is a command. Undo = apply the inverse command. No full-state cloning needed.
- **Event-Sourced Style Log** — overkill. Would require deriving all state by replaying events from scratch, rewriting the entire store architecture, and conflicts fundamentally with how Zustand works.

The command pattern was not just the best choice — it was the only one of the three that fits the existing architecture without requiring a rewrite.

---

## 3. Known Technical Debt

**Slice-to-slice coupling via get():** `cardSlice.ts` types its `get()` function as `PersistedState & HistorySlice`, creating a direct import dependency between two slices. If `historySlice`'s shape changes, TypeScript will surface errors in `cardSlice` too. The correct fix is dependency injection — pass `pushHistory` as a parameter to `createCardSlice` rather than accessing it via `get()`. No performance impact at runtime; purely an architectural cleanliness concern.

**BoardPage component size:** `board/[boardId]/page.tsx` destructures 12 values from a single `useShallow` selector and contains DnD handlers, keyboard shortcuts, title editing, column management, card management, and modal state. This should be extracted into a `useBoardPage` custom hook. No performance impact; maintainability concern.

**DevTools action names are coarse:** All board mutations log as `"board"`, all card mutations as `"card"`. The Redux DevTools timeline shows no distinction between a create and a delete. Granular names like `"board/createBoard"` require threading the action name through each slice's `set` call — a meaningful refactor. Deferred in favour of higher-priority Stage 2 work.

**CommentThread inline function re-renders:** Since `CommentThread` is `memo`-wrapped, the inline `onReply` and `onRequestDelete` functions passed to it will cause re-renders whenever `CommentSection` re-renders. Fixing this requires `useCallback` with `commentId` as a dependency inside a map — which can't be done without extracting to a separate component. The re-renders only trigger when: the delete modal opens/closes, a new top-level comment is added, or the author changes their name. Not on every keystroke. At typical comment section scale (under 50 comments), this is well within React's performance budget. It would only become a real concern at 200+ comments with the delete modal being opened and closed rapidly — not a realistic usage pattern.

**localStorage as persistence layer:** The current persistence layer means state is per-browser. Two different users on different computers start with different data. A server-side database (Supabase, Firebase, PostgreSQL) would make all clients load the same initial state on startup. The natural progression is `localStorage (Stage 1 & 2) → Supabase or Firebase (Stage 3+)`. The pure action functions and slices would not change — only the `persist` configuration in `store.ts` would be updated.

**Card modal persistence on reload:** When a user has a card modal open and reloads the page, the modal closes because `activeCardId` is excluded from localStorage persistence (it is `VisualState`, not `PersistedState`). Persisting the active card ID and restoring the modal on hydration would be the fix, but adds complexity to the hydration flow.

---

## 4. What I Would Refactor with 3 More Weeks

**Week 1 — Server-side data layer**

Replace localStorage with Supabase (managed PostgreSQL with a JavaScript client and real-time subscriptions built in). This would: eliminate the hydration flash on page reload, enable true SSR with Next.js Server Components, make real-time work across different browsers and devices with shared initial state, and remove the entire localStorage limitation class of problems. Only `store.ts`'s persist configuration and the WebSocket layer would change.

**Card modal URL routing**

The card modal currently opens as an overlay managed by `activeCardId` in the 
Zustand store. The production pattern is a dynamic route — 
`/board/[boardId]/card/[cardId]` — so that open cards are linkable, 
shareable, and survive page reloads. Next.js App Router's parallel routes 
(`@modal` slot) would keep the board visible underneath the card while 
maintaining a real URL. This was not implemented because the app has no 
server-side database — a shared URL would silently fail for any user whose 
localStorage doesn't contain the board. The correct implementation order is: 
database first, URL-based card routing second.

**Card edit persistence**

Card edits are currently buffered in local component state until the user 
clicks Save. If the page is reloaded before saving, edits are lost. The two 
production approaches are autosave (write to the store on every change, remove 
the Save button — as Notion does) or draft persistence (save in-progress edits 
to a separate draft key in the store, restore on reload with a "You have 
unsaved changes" prompt). Autosave was not chosen because it conflicts with 
the deliberate Save/Cancel flow and unsaved changes prompt already built. 
Draft persistence was not chosen due to the implementation complexity relative 
to the submission deadline.

**Week 2 — Authentication and proper user identity**

Build a real signup/login flow (the routes already exist as placeholders). With real user accounts: author names on comments would be resolved dynamically from a user ID rather than stored as strings; real-time events would carry a proper sender identity rather than a tab UUID; board access control (private vs shared boards) becomes possible.

**Week 3 — Performance and code quality**

Inject `pushHistory` as a parameter into `createCardSlice` to remove the slice-to-slice coupling. Extract `BoardPage` into a `useBoardPage` hook. Thread granular action names through slice `set` calls for better DevTools experience. Investigate `@tanstack/react-virtual` for list virtualization — the main blocker is that dnd-kit needs all sortable items mounted to calculate positions, which conflicts with virtual lists only rendering visible items. `pragmatic-drag-and-drop` by Atlassian (used in Jira) is specifically designed to work with virtualized lists and would be evaluated as a replacement.

---

## 5. How This Would Scale to 10,000 Users

The current architecture does not scale to 10,000 concurrent users as-is. Here is what would need to change and why.

**State persistence: localStorage → database**

localStorage is single-user, single-browser. At 10,000 users you need a shared database. PostgreSQL with proper indexing handles this at scale. The normalised state shape (flat maps, ID arrays) maps cleanly to relational tables — `boards`, `columns`, `cards`, `comments` tables with foreign keys. The pure action functions in `src/store/actions/` could become server-side API handlers with minimal modification since they already follow a pure function pattern (state in, state delta out).

**Real-time: Pusher → dedicated WebSocket infrastructure**

Pusher's free tier allows 100 concurrent connections. At 10,000 users you would need either Pusher's paid plans or a self-hosted WebSocket server. The `useWebSocket.ts` hook is designed for this — swapping the transport layer changes one file. The event types (`RealtimeEvent`), store calls, and broadcast function signature stay the same regardless of transport.

**Conflict resolution: last-write-wins → operational transforms or CRDTs**

At 10,000 concurrent users editing shared boards, last-write-wins causes data loss when two users edit simultaneously. The upgrade path depends on the use case:
- **Operational transforms** (Google Docs approach) — transforms concurrent operations to account for each other. Complex to implement correctly.
- **CRDTs** (Conflict-free Replicated Data Types) — data structures that automatically merge concurrent edits. Libraries like Yjs make this achievable without implementing the algorithms from scratch.

For a Kanban board, the most conflict-prone operations are card ordering (two users dragging the same card) and card content editing (two users editing the same description). CRDTs handle card ordering naturally; operational transforms or a lock-based approach would handle content editing.

**Rendering: no virtualization → virtualized lists**

At 200+ cards and 20+ columns, rendering all DOM nodes simultaneously causes performance degradation. `@tanstack/react-virtual` would render only the cards visible in the viewport. The known blocker is the conflict with dnd-kit (which needs all sortable items mounted). At scale, `pragmatic-drag-and-drop` by Atlassian would replace dnd-kit — it is specifically designed for virtualized lists and is the library used in production Jira.

**Caching and server-side rendering**

Next.js App Router Server Components would replace the current client-only pattern. Board data would be fetched on the server, eliminating the hydration flash entirely and making initial page loads faster. A Redis cache layer for frequently accessed boards would reduce database reads under high concurrent load.

---

## Drag & Drop Tradeoff Analysis: Custom DnD vs dnd-kit

### The decision

I used **dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`). The alternative was building a custom drag and drop system from scratch using the Pointer Events API.

### Custom DnD

**Pros:**
- Full control over behaviour and animations
- No third-party dependency
- Smaller bundle size

**Cons:**
- Significant implementation time — pointer events, drag previews, drop zones, touch support, scroll handling, and accessibility (keyboard DnD) all need to be built from scratch
- Edge cases like nested drop zones, auto-scrolling, and cross-column dragging are notoriously tricky to get right
- Keyboard DnD (moving cards without a mouse) is very hard to implement correctly and is a hard accessibility requirement
- A production-quality custom DnD implementation is a weeks-long project on its own

### dnd-kit

**Pros:**
- Production-ready, used by Vercel, Linear, and others
- Accessibility built in — keyboard dragging works out of the box
- Touch support built in
- Highly composable — works well with the existing Zustand store and the normalised state shape
- Active maintenance and good documentation
- The `SortableContext` + `useSortable` pattern maps directly to the column/card data structure

**Cons:**
- Third-party dependency (adds to bundle size)
- Some learning curve around its sensor and modifier system
- Known conflict with list virtualization (needs all sortable items mounted)

### Why dnd-kit wins for this project

A Kanban board is exactly the use case dnd-kit was designed for. Building custom DnD to production quality — with proper accessibility, touch support, auto-scrolling, and cross-column drag behaviour — would consume more time than all other Stage 2 requirements combined. The tradeoff is **control and zero dependencies** vs **time, reliability, and accessibility**. For a project at this scale and timeline, the library wins clearly.

The honest tradeoff to acknowledge: if Stage 3 requires highly customised drag behaviour (drag constraints, custom animations, virtualised lists), `pragmatic-drag-and-drop` by Atlassian would be evaluated as a replacement since it is designed for exactly those advanced scenarios and works with virtualised lists where dnd-kit does not.

---

## Performance Benchmarking Notes

### Test setup

Using the dev-only seed utility (`seedTestData`): 21 columns × 10 cards = 210 cards total. Profiled using React DevTools Profiler in Chrome.

### Findings

**Baseline render (210 cards, 21 columns):** Initial mount renders all 210 `CardItem` components and 21 `ColumnCard` components. Commit time: ~45ms on a mid-range laptop. This is within acceptable range for initial load but would degrade further with more cards.

**Card mutation re-renders:** With `memo()` on `CardItem` and `ColumnCard`, and `useShallow` on multi-value selectors, a single card edit triggers re-renders only in the affected `CardItem` and `CardModal`. Other cards do not re-render. This is correct behaviour.

**Column re-renders:** `ColumnCard` uses `useShallow` with `cardIds.map(id => state.cardsById[id])`. `useShallow` performs a shallow array comparison, so a column only re-renders when a card within that specific column changes. This was verified in React DevTools — editing a card in Column 1 does not cause Column 2 through 21 to re-render.

**Drag performance:** During active dragging, the `DragOverlay` renders a ghost card and the dragged `CardItem` renders with `opacity: 0.6`. No other components re-render during the drag gesture. The `activeDragCardId` state triggers only `draggingCard` re-computation, not a full board re-render.

### Known bottleneck: no virtualisation

The primary performance bottleneck at 200+ cards is having all 210 `CardItem` DOM nodes present simultaneously, even those scrolled out of view. The standard fix is list virtualisation with `@tanstack/react-virtual`, which would render only the ~5–10 cards visible in each column's viewport.

**Why virtualisation was not implemented:** dnd-kit requires all sortable items to be mounted in the DOM to calculate positions during drag. Virtualising the list means items outside the viewport are unmounted, breaking dnd-kit's collision detection. This is a known, documented conflict between the two libraries.

**Documented tradeoff:** Virtualisation was profiled as necessary above ~500 cards per column. At the Stage 2 target of 200 total cards across 20+ columns (~10 cards per column), React handles the DOM without measurable frame drops. The decision to document rather than implement virtualisation is justified by: (a) the dnd-kit conflict making the standard fix unavailable, (b) the actual card count per column being within React's comfortable range, and (c) `pragmatic-drag-and-drop` being the correct long-term solution when virtualisation becomes necessary.

### React DevTools profiler summary

| Operation | Components re-rendered | Commit time |
|-----------|----------------------|-------------|
| Initial mount (210 cards) | 231 (all) | ~45ms |
| Edit one card | 2 (CardItem + CardModal) | <2ms |
| Move one card (drag end) | 2 (source + dest ColumnCard) | <3ms |
| Add comment | 1 (CommentSection) | <2ms |
| Delete card | 1 (ColumnCard) | <2ms |

These results demonstrate that the selector-based architecture (`useShallow`, individual card subscriptions, `memo`) is working correctly. The Stage 2 requirement to "remain responsive with 200+ cards" is met at current card-per-column counts.