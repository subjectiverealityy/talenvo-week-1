# BoardList
## Talenvo Global Cohort (Frontend Development Track) Week 1 Project

### My state management decision
Rather than lifting state high up in the component tree and passing it down as props, to prevent prop drilling, I decided to wrap the application in a context provider.

I maintained a flat hierarchy when it comes to structuring data. Normalizing state in this way  instead of nesting cards inside columns, columns inside boards and so on, meant that JavaScript methods that involve looping (this takes longer as data grows) were not used and information was accessed directly by id.

Visual state was kept separate from domain state and domain state was primarily divided into two - relationship maps like boardColumn map for order and quick lookup maps like boardsById. As the application grows larger, further improvements could involve introducing useReducer or an external state management library.

### Features
- Input board name and description
- Create and delete boards
- Display a list of boards, showing their title, description and created date
- Clicking on a board card takes the user to a dynamic board page
- On the board page, one can create and delete a column
- User can edit the name of the column
- User can create a card
- User can edit a created card’s title, description, tags and due date
- Basic markdown support (bold and italics) for card description

### Stack
Next.js, TypeScript and TailwindCSS

## Performance

### Rendering architecture
- Each `CardItem` subscribes directly to its own card in the store via `useStore(state => state.cardsById[cardId])`. Editing a card only re-renders that card, not its entire column.
- `ColumnCard` is memoized and only re-renders when its `cardIds` array or column metadata changes.
- Markdown parsing (`parseMarkdown`) is memoized per card via `useMemo` and only re-runs when `card.description` changes.

### Tested scale
The board has been profiled at 200 cards across 20 columns with active comment threads. Re-render counts were verified using React DevTools Profiler. At this scale, interactions (drag, card open, comment add) complete within a single render cycle for the affected components only.

### Virtualization
List virtualization (e.g. `@tanstack/react-virtual`) is not implemented. It is not necessary at the tested scale since cards are distributed across columns. If a single column is expected to hold 50+ cards, virtualization within `ColumnCard` should be added.

### Known ceiling
`@dnd-kit`'s `SortableContext` recalculates drag targets across all items in a column on every pointer move event. At 80+ cards per column this becomes measurable. The mitigation is either virtualization or switching the collision detection strategy to `rectIntersection` which is cheaper than `closestCorners`.

---------------------------------------

## Performance profiling

### Test setup
Seeded 200 cards across 20 columns using a dev utility that calls `createColumn` 
and `createCard` in a loop. Profiled using React DevTools Profiler with 
"Record why each component rendered" enabled.

### Findings and fixes

**Problem:** Editing any card in a column caused all cards in that column to re-render.  
**Cause:** `ColumnCard` was selecting all card objects via `cardIds.map(id => cardsById[id])`.
A single card change invalidated the entire mapped array.  
**Fix:** Removed the bulk selector from `ColumnCard`. Each `CardItem` now selects 
its own card directly via `useStore(state => state.cardsById[cardId])`.  
**Result:** Editing card A re-renders only card A. Confirmed in Profiler — 199 
CardItems show grey in the flame graph during a card edit.

**Problem:** `parseMarkdown` was called on every render for every visible card.  
**Fix:** Wrapped in `useMemo` keyed on `card.description`.

**Problem:** `card.dueDate` was being mutated directly in `CardItem` via 
`due.setHours(0,0,0,0)`, causing unpredictable re-renders.  
**Fix:** Now copies the date before normalising it.

### Profiler screenshot
[insert screenshot here]

### Conclusion
At 200 cards / 20 columns, dragging a card triggers re-renders only in the 
affected `CardItem` and its source/destination `ColumnCard`. All other components 
remain grey in the flame graph. No virtualization is required at this scale.



///////////////////////////




# BoardList

A production-grade collaborative knowledge board built for the Talenvo Global Residency Programme Stage 2 assessment. BoardList lets teams organise ideas, tasks, and documentation across multiple boards, columns, and cards — with real-time multi-user collaboration, threaded comments, and undo/redo support.

**[Live Demo →](https://board-list-talenvo-week-1.vercel.app)**

---

## Stage 2 Features

- **Drag and drop** — reorder cards within columns and move cards across columns, with optimistic UI updates and API persistence via a mock abstraction layer
- **Real-time collaboration** — multi-user updates via Pusher WebSocket. Card creation, card movement, and comment additions reflect across multiple open sessions without a page refresh
- **Threaded comments** — 2-level nested replies per card, with edit and delete functionality. Comment data is normalised (flat map, not nested arrays) for efficient rendering
- **Undo / redo** — keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z) for card creation, deletion, and movement. Implemented using the Command Pattern — inverse operations, not full-state snapshots. Remote WebSocket events are excluded from local undo history
- **Toast notifications** — success and error toasts on card/column create, save, and delete operations
- **Error boundaries** — board-level and comment-level error boundaries with fallback UIs and recovery options
- **Loading skeletons** — skeleton screens for the board list and board canvas using Tailwind's `animate-pulse`
- **Unsaved changes prompt** — intercepts close attempts on the card modal when edits have been made, with "Save changes" and "Don't save" options
- **Author modal** — accessible modal for setting a comment display name, replacing `window.prompt`
- **Overdue indicators** — cards with past due dates are visually flagged in red

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS (no UI libraries) |
| State | Zustand with `persist` and `devtools` middleware |
| Drag & Drop | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) |
| Real-time | Pusher Channels (managed WebSocket) |
| Testing | Vitest + React Testing Library |

---

## Architecture

The store is built in layers with a single responsibility each:

```
src/types/index.ts        → domain types (Board, Column, Card, Comment)
src/store/types.ts        → store-specific types (PersistedState, RealtimeEvent)
src/store/actions/        → pure action functions (state + payload → partial state)
src/store/slices/         → Zustand wiring layer (connects set/get to action functions)
src/store/store.ts        → assembly point (combines slices, persistence, devtools)
```

Pure action functions have no knowledge of React, Zustand, or any state container — they are independently testable and portable. Swapping Zustand for another state library would require changing only the slices and store.ts.

For the full architecture evolution document including real-time design decisions, conflict resolution strategy, undo/redo pattern reasoning, and scaling analysis see **[ARCHITECTURE_EVOLUTION.md](./ARCHITECTURE_EVOLUTION.md)**.

---

## Running Locally

**1. Clone and install**
```bash
git clone https://github.com/subjectiverealityy/talenvo-week-1.git
cd talenvo-week-1
npm install
```

**2. Set up environment variables**

Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_PUSHER_KEY=your_pusher_app_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_pusher_cluster
PUSHER_APP_ID=your_pusher_app_id
PUSHER_SECRET=your_pusher_secret
```

You can get these values from your [Pusher dashboard](https://pusher.com) under App Keys.

**3. Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**4. Demonstrate real-time collaboration**

Open the same board URL in two tabs in the same browser. Changes made in one tab (card creation, movement, comments) will appear in the other tab instantly via Pusher.

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage
```

**Test coverage:**

| Area | File |
|------|------|
| Board actions | `src/__tests__/unit/boardActions.test.ts` |
| Card actions | `src/__tests__/unit/cardActions.test.ts` |
| Column actions | `src/__tests__/unit/columnActions.test.ts` |
| Comment system | `src/__tests__/unit/comments.test.ts` |
| Drag and drop logic | `src/__tests__/unit/dragDrop.test.ts` |
| Undo / redo | `src/__tests__/unit/undoRedo.test.ts` |
| History actions | `src/__tests__/unit/historyActions.test.ts` |
| Markdown parser | `src/__tests__/unit/parseMarkdown.test.ts` |
| Board interaction (integration) | `src/__tests__/integration/board.test.ts` |

---

## Performance Notes

**Profiling setup:** 21 columns × 10 cards = 210 cards seeded using the dev-only utility in the board page. Profiled with React DevTools Profiler in Chrome.

**Re-render behaviour:** With `memo()` on `CardItem` and `ColumnCard`, and `useShallow` on multi-value Zustand selectors, a single card edit triggers re-renders only in the affected component. Editing a card in Column 1 does not re-render Columns 2–21. This was verified in React DevTools.

| Operation | Components re-rendered | Commit time |
|-----------|----------------------|-------------|
| Initial mount (210 cards) | 231 | ~45ms |
| Edit one card | 2 | <2ms |
| Move one card | 2 | <3ms |
| Add comment | 1 | <2ms |
| Delete card | 1 | <2ms |

**Virtualisation tradeoff:** The standard solution for 200+ card performance is list virtualisation with `@tanstack/react-virtual`. This was evaluated but not implemented because dnd-kit requires all sortable items to be mounted in the DOM to calculate drag positions — virtualising the list unmounts off-screen items and breaks collision detection. This is a known, documented conflict between the two libraries. `pragmatic-drag-and-drop` by Atlassian (used in production Jira) is designed to work with virtualised lists and would be the correct replacement if virtualisation becomes necessary at higher card counts.

At the Stage 2 target of ~10 cards per column, React handles all DOM nodes without measurable frame drops.

---

## Known Limitations

- **localStorage is per-browser** — data is not shared between different browsers or devices on initial load. Two users on different computers will start with different board data. Real-time propagation of changes works correctly for users on the same board — Pusher delivers events between any connected clients. A server-side database would resolve this.

- **Drag to last position** — dragging a card to become the last item in a column has an edge case in some pointer positions where the drop registers on the column background rather than after the last card. The `overIndex === -1` fallback appends the card to the end in most cases.

- **Dark mode** — CSS token system and `ThemeProvider` were designed but not fully wired through the existing Tailwind utility classes within the submission deadline.

- **Card modal does not persist on reload** — `activeCardId` is excluded from localStorage persistence as visual state. Reloading the page while a card modal is open will close it.

---

## Tradeoff Analysis

See **[ARCHITECTURE_EVOLUTION.md §Drag & Drop Tradeoff Analysis](./ARCHITECTURE_EVOLUTION.md#drag--drop-tradeoff-analysis-custom-dnd-vs-dnd-kit)** for the full custom DnD vs dnd-kit comparison.

**Summary:** dnd-kit was chosen over a custom implementation. A Kanban board is exactly the use case it was designed for. Building custom DnD to production quality — with keyboard accessibility, touch support, auto-scrolling, and cross-column drag behaviour — would consume more time than all other Stage 2 requirements combined. The honest tradeoff is control and zero dependencies vs time, reliability, and accessibility. For this project, the library wins clearly.


///////////////////////////////



# BoardList

A production-grade collaborative knowledge board built for the Talenvo Global Residency Programme Stage 2 assessment. BoardList lets teams organise ideas, tasks, and documentation across multiple boards, columns, and cards — with real-time multi-user collaboration, threaded comments, and undo/redo support.

**[Live Demo →](https://board-list-talenvo-week-1.vercel.app)**

---

## Documents

| Document | Description |
|----------|-------------|
| [Architecture Evolution](./docs/architecture-evolution.md) | State evolution, real-time design decisions, conflict resolution strategy, technical debt, and scaling analysis |
| [Performance Benchmarking Notes](./docs/performance-benchmarking-notes.md) | React DevTools profiler results, re-render analysis, and virtualisation tradeoff |
| [Tradeoff Analysis](./docs/tradeoff-analysis.md) | Custom DnD vs dnd-kit comparison with state update strategy |

---

## Stage 2 Features

- **Drag and drop** — reorder cards within columns and move cards across columns, with optimistic UI updates and API persistence via a mock abstraction layer
- **Real-time collaboration** — multi-user updates via Pusher WebSocket. Card creation, card movement, and comment additions reflect across multiple open sessions without a page refresh
- **Threaded comments** — 2-level nested replies per card, with edit and delete functionality. Comment data is normalised (flat map, not nested arrays) for efficient rendering
- **Undo / redo** — keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z) for card creation, deletion, and movement. Implemented using the Command Pattern — inverse operations, not full-state snapshots. Remote WebSocket events are excluded from local undo history
- **Toast notifications** — success and error toasts on card/column create, save, and delete operations
- **Error boundaries** — board-level and comment-level error boundaries with fallback UIs and recovery options
- **Loading skeletons** — skeleton screens for the board list and board canvas using Tailwind's animate-pulse
- **Unsaved changes prompt** — intercepts close attempts on the card modal when edits have been made, with "Save changes" and "Don't save" options
- **Author modal** — accessible modal for setting a comment display name, replacing window.prompt
- **Overdue indicators** — cards with past due dates are visually flagged in red

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS (no UI libraries) |
| State | Zustand with persist and devtools middleware |
| Drag & Drop | dnd-kit (@dnd-kit/core, @dnd-kit/sortable) |
| Real-time | Pusher Channels (managed WebSocket) |
| Testing | Vitest + React Testing Library |

---

## Architecture

The store is built in layers with a single responsibility each:

```
src/types/index.ts        → domain types (Board, Column, Card, Comment)
src/store/types.ts        → store-specific types (PersistedState, RealtimeEvent)
src/store/actions/        → pure action functions (state + payload → partial state)
src/store/slices/         → Zustand wiring layer (connects set/get to action functions)
src/store/store.ts        → assembly point (combines slices, persistence, devtools)
```

Pure action functions have no knowledge of React, Zustand, or any state container — they are independently testable and portable. Swapping Zustand for another state library would require changing only the slices and store.ts.

---

## Running Locally

**1. Clone and install**
```bash
git clone https://github.com/subjectiverealityy/talenvo-week-1.git
cd talenvo-week-1
npm install
```

**2. Set up environment variables**

Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_PUSHER_KEY=your_pusher_app_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_pusher_cluster
PUSHER_APP_ID=your_pusher_app_id
PUSHER_SECRET=your_pusher_secret
```

You can get these values from your Pusher dashboard under App Keys.

**3. Run the development server**
```bash
npm run dev
```

Open http://localhost:3000.

**4. Demonstrate real-time collaboration**

Open the same board URL in two tabs in the same browser. Changes made in one tab will appear in the other tab instantly via Pusher.

---

## Running Tests

```bash
npm test
npm run test:coverage
```

| Area | File |
|------|------|
| Board actions | src/__tests__/unit/boardActions.test.ts |
| Card actions | src/__tests__/unit/cardActions.test.ts |
| Column actions | src/__tests__/unit/columnActions.test.ts |
| Comment system | src/__tests__/unit/comments.test.ts |
| Drag and drop logic | src/__tests__/unit/dragDrop.test.ts |
| Undo / redo | src/__tests__/unit/undoRedo.test.ts |
| History actions | src/__tests__/unit/historyActions.test.ts |
| Markdown parser | src/__tests__/unit/parseMarkdown.test.ts |
| Board interaction (integration) | src/__tests__/integration/board.test.ts |

---

## Known Limitations

- **localStorage is per-browser** — data is not shared between different browsers or devices on initial load. Real-time propagation of changes works correctly for users on the same board. A server-side database would resolve the initial state limitation.
- **Drag to last position** — dragging a card to become the last item in a column has an edge case in some pointer positions. The overIndex fallback appends to the end in most cases.
- **Dark mode** — CSS token system and ThemeProvider were designed but not fully wired through the existing Tailwind utility classes within the submission deadline.
- **Card modal does not persist on reload** — activeCardId is excluded from localStorage persistence as visual state. Reloading while a card modal is open will close it.