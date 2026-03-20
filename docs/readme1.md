# BoardList — Stage 2 Submission to Talenvo Global Residency
## Architecture, Engineering Decisions, and Performance Strategy

---

## 1. Folder Structure Explanation

```
talenvo-stage-1/
├── src/
│   ├── app/                          # Next.js App Router pages and layouts
│   │   ├── (public-auth-route)/      # Public routes: /login, /signup
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (protected-entry-route)/  # Will require auth before accessing
│   │   │   └── board-list/           # Dashboard: lists all boards
│   │   ├── (protected-board-route)/ 
│   │   │   └── board/[boardId]/      # Dynamic route: specific board with columns and cards
│   │   ├── api/                      # Server-side API routes
│   │   │   └── pusher/               # WebSocket infrastructure: broadcasts real-time events
│   │   ├── hooks/                    # Custom hooks 
│   │   │   └── useWebSocket.ts       # Real-time subscription and broadcast logic
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Root page 
│   │   └── styles/                   # Global styles
│   │
│   ├── components/                   # Reusable React components (no logic, just rendering)
│   │   ├── board/                    
│   │   │   ├── BoardCard.tsx         # A single board 
│   │   │   ├── BoardInputField.tsx   # Input for board title and description
│   │   │   ├── BoardList.tsx         # All boards
│   │   │   ├── CreateBoardComponent.tsx
│   │   │   └── CreateBoardModal.tsx
│   │   ├── column/                   
│   │   │   ├── Column.tsx          
│   │   │   ├── ColumnCard.tsx        
│   │   │   ├── ColumnModal.tsx       
│   │   │   └── CreateColumnComponent.tsx
│   │   ├── card/                     
│   │   │   ├── Card.tsx             
│   │   │   ├── CardItem.tsx          # Individual card
│   │   │   ├── CardModal.tsx         # Full card view with all fields
│   │   │   │                       
│   │   │   ├── ExpandedCard.tsx      
│   │   │   └── CommentSection.tsx    # Renders threaded comments (two levels deep)
│   │   └── ui/                       
│   │       ├── Button.tsx            
│   │       ├── Input.tsx             
│   │       ├── Modal.tsx             
│   │       ├── Badge.tsx             
│   │       ├── Toast.tsx             
│   │       ├── ConfirmDeleteModal.tsx 
│   │       ├── AuthorModal.tsx       # Prompt for user name when attempting to make first comment
│   │       └── ErrorBoundary.tsx     # Catches render errors 
│   │
│   ├── context/                      # React context providers
│   │   └── ToastContext.tsx          # Global toast notification context
│   │
│   ├── lib/                          # Pure utility functions
│   │   ├── markdown.ts               # Markdown parser (bold and italics)
│   │   ├── mockApi.ts                # Mock API abstraction for persistence
│   │   ├── useAuthor.ts              # Hook for managing comment author name
│   │   └── utils.ts                  # General utilities (isEmpty, clampIndex, etc.)
│   │
│   ├── store/                        # Zustand state management + slices
│   │   ├── store.ts                  # Assembly point: combines all slices
│   │   ├── types.ts                  # Store-specific types 
│   │   ├── actions/                  # Pure action functions 
│   │   │   ├── boardActions.ts       # createBoard, editBoard, deleteBoard
│   │   │   ├── columnActions.ts      # createColumn, editColumn, deleteColumn
│   │   │   ├── cardActions.ts        # createCard, editCard, deleteCard, moveCard
│   │   │   └── commentActions.ts     # createComment, editComment, deleteComment
│   │   └── slices/                   # Zustand wiring layer (connects actions to store)
│   │       ├── boardSlice.ts         # Exposes: createBoard, editBoard, deleteBoard
│   │       ├── columnSlice.ts        # Exposes: createColumn, editColumn, deleteColumn
│   │       ├── cardSlice.ts          # Exposes: createCard, editCard, deleteCard, moveCard
│   │       ├── commentSlice.ts       # Exposes: createComment, editComment, deleteComment
│   │       └── historySlice.ts       # Exposes: undo, redo, pushHistory, canUndo, canRedo
│   │
│   ├── types/                        # Domain types (shared across the app)
│   │   └── index.ts                  # Board, Column, Card, Comment, User types
│   │
│   └── __tests__/                    # Tests
│       ├── unit/                     # Unit tests for pure functions
│       │   ├── dragDrop.test.ts      
│       │   ├── undoRedo.test.ts      
│       │   ├── comments.test.ts      
│       │   ├── boardActions.test.ts  
│       │   ├── cardActions.test.ts   
│       │   ├── columnActions.test.ts 
│       │   └── parseMarkdown.test.ts
│       └── integration/              # Integration tests
│           └── board.test.ts         # Tests full board workflow 
│
├── docs/                             # Documentation
│   ├── architecture.md              
│   ├── tradeoff-analysis.md          # custom Dnd vs library
│   ├── performance-benchmarking-notes.md # React DevTools profiling results
│   └── readme1.md                    
│
├── public/                        
├── assets/                           
├── package.json                   
├── tsconfig.json                    
├── next.config.ts                   
├── vitest.config.ts                 
├── tailwind.config.ts            
└── README.md                       

```

---

## 2. State Architecture Diagram & Reasoning

### The Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                             │
│   (Click "Create Card" button, drag card, submit comment)          │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  React Component (CardItem)    │
        │  calls: store.createCard({})   │
        └────────┬───────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────────┐
    │  Zustand Store (store.ts)            │
    │  Slice: cardSlice.createCard()       │
    └────────┬─────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────────┐
    │  Pure Action Function                    │
    │  cardActions.createCard(state, payload) │
    │  Returns: Partial<PersistedState>       │
    └────────┬─────────────────────────────────┘
             │
             ├─► Updates store state (set)
             ├─► Pushes to undo history
             └─► Broadcasts to WebSocket
                  │
                  ▼
        ┌─────────────────────┐
        │   Pusher WebSocket  │
        │   (/api/pusher)     │
        └─────────────────────┘
                  │
                  ▼
        ┌──────────────────────────────┐
        │ Other Connected Clients      │
        │ Receive: CARD_CREATED event │
        │ Call: store.createCard({     │
        │        ...payload,           │
        │        skipHistory: true })  │
        └──────────────────────────────┘
```

### State Shape (Normalized)

```typescript
// PersistedState — stored in localStorage and Zustand
{
  // Boards
  boardsById: {
    "board1": { id, title, description, dateCreated }
  },
  boardIds: ["board1", "board2"],

  // Columns
  columnsById: {
    "col1": { id, boardId, title }
  },
  boardColumnMap: {
    "board1": ["col1", "col2"]  // preserves order
  },

  // Cards
  cardsById: {
    "card1": { id, columnId, title, description, tags, dueDate }
  },
  columnCardMap: {
    "col1": ["card1", "card2", "card3"]  // top-level order
  },

  // Comments (2+ level nesting)
  commentsById: {
    "comment1": { id, cardId, parentId: null, author, body, createdAt, editedAt }
    "comment2": { id, cardId, parentId: "comment1", author, body, ... }  // reply
  },
  cardCommentMap: {
    "card1": ["comment1"]  // only top-level comments listed
  },
  commentReplyMap: {
    "comment1": ["comment2"]  // nested replies
  }
}

// VisualState — NOT persisted (lost on refresh)
{
  activeCardId: string | null  // which card modal is open
}

// HistoryState — list of past and future actions
{
  past: [
    { type: "CREATE_CARD", payload: { card, columnId, index } },
    { type: "MOVE_CARD", payload: { cardId, fromColumnId, ... } }
  ],
  future: []
}
```

### Why Normalized State?

❌ **Nested Shape Example:**
```typescript
boards: [
  {
    id: "board1",
    columns: [
      {
        id: "col1",
        cards: [
          { id: "card1", ... }
        ]
      }
    ]
  }
]
```
- Editing a deeply nested card requires cloning the entire path (board → column → card)
- Searching for a card by ID requires traversal
- Rendering deeply nested arrays is inefficient
- History/undo is expensive (the entire nested tree has to be captured)

✅ **Normalized State (chosen):**
```typescript
{
  boardsById: { "board1": {...} },
  columnsById: { "col1": {...} },
  cardsById: { "card1": {...} },
  boardColumnMap: { "board1": ["col1"] },
  columnCardMap: { "col1": ["card1"] }
}
```
- O(1) lookups by ID
- Editing a card: update `cardsById[cardId]` only
- Searching by ID: direct access
- History/undo: capture card object once, not entire tree
- Rendering: iterate ordering maps independently

---

## 3. Performance Strategy

### Rendering Optimizations

#### **1. Component Memoization**
```typescript
// CardItem is memoized — re-renders only when props change
const CardItem = memo(function CardItem({ card, onOpen, onDelete }) {
  return (
    <article
      onClick={() => onOpen(card.id)}
      // ...
    >
      {card.title}
    </article>
  );
});
```

**Effect:** Editing a card in Column A does not cause Column B's cards to re-render.

#### **2. Selector-Based Subscriptions**
```typescript
// ColumnCard subscribes only to its column's card IDs
const column = useStore((state) => state.columnsById[columnId]);
const cardIds = useStore((state) => state.columnCardMap[columnId]);

// useShallow prevents re-renders when the array is shallowly equal
const cardsData = useStore(
  useShallow((state) => cardIds.map(id => state.cardsById[id]))
);
```

**Effect:** Adding a comment to card A in Column A does not re-render Column B.

#### **3. Callback Memoization**
```typescript
const handleDragStart = useCallback((event) => {
  // ...
}, []);

const handleCreateCard = useCallback((payload) => {
  store.createCard(payload);
}, []);
```

**Effect:** Memoized children remain memoized (their `memo()` is effective).

#### **4. Drag-Time Isolation**
```typescript
// During a drag, only the dragging card and affected columns re-render
// Other components stay grey in React DevTools Profiler
<DragOverlay>
  {draggingCard && <div>{draggingCard.title}</div>}
</DragOverlay>
```

**Effect:** Dragging 200+ cards remains smooth.

### Performance Testing

**Test setup:** 21 columns × 10 cards = 210 cards (seeded using `seedTestData()` utility)

**Results (measured with React DevTools Profiler):**

| Operation | Components Re-rendered | Commit Time |
|-----------|----------------------|-------------|
| Initial mount | 231 (all) | ~45ms |
| Edit one card | 2 (CardItem + CardModal) | <2ms |
| Move one card (drag end) | 2 ColumnCards + 1 BoardPage | <5ms |
| Add comment | CommentSection + CommentItem | ~9ms |
| Delete a card | ColumnCard | <3ms |

**Conclusion:** At 200+ cards, the app remains responsive. No frame drops below 60 FPS.

### Known Bottleneck & Mitigation Path

**Bottleneck:** Without list virtualization, rendering 500+ cards simultaneously would degrade.

**Mitigation:** `@tanstack/react-virtual` can reduce DOM nodes to only visible cards.

**Why not implemented:** dnd-kit requires all sortable items mounted in the DOM to calculate drag positions. Virtualizing unmounts items outside viewport → collision detection breaks.

**Future solution:** `pragmatic-drag-and-drop` by Atlassian is a DnD library that is designed for virtualized lists.

---

## 4. Explanation of Key Engineering Decisions

### Decision 1: Zustand Over useReducer + Context

**Stage 1 approach:** `useReducer` with custom context provider (`StoreProvider`)

**Problem:**
- No built-in devtools integration
- Custom localStorage serialization
- Every subscription is a context consumer (prop drilling risk)
- Adding features (real-time, undo/redo) required threading concerns through reducer

**Stage 2 solution:** Zustand with sliced architecture

**Why Zustand:**
| Concern | useReducer | Zustand |
|---------|-----------|---------|
| DevTools | Manual setup | Built-in middleware |
| localStorage | Custom code | `persist` middleware + `reviver` |
| Subscriptions | Context consumers | Selector-based (no props) |
| Outside components | Not possible | `useStore.getState()` anywhere |
| TypeScript | Good | Excellent |

**Code:**
```typescript
// OLD: useReducer + Context
const [state, dispatch] = useReducer(boardReducer, initialState);
<StoreContext.Provider value={{state, dispatch}}>

// NEW: Zustand
const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({...slices})
    )
  )
);
```

**Benefit:** WebSocket listeners can now call `useStore.getState()` outside of React components - enabling real-time updates anywhere.

---

### Decision 2: Pusher WebSocket Over BroadcastChannel

**Requirements:** Multi-user updates reflecting instantly across multiple sessions.

**Three options evaluated:**

| | Polling | BroadcastChannel | Pusher |
|---|---------|------------------|--------|
| Latency | 2-3 seconds | Instant | Instant |
| Same browser | ✓ | ✓ | ✓ |
| Cross-browser | ✓ (eventual) | ✗ | ✓ |
| Cross-device | ✗ | ✗ | ✓ |
| Infrastructure | None | None | Managed service |

**Decision:** Pusher

**Why:**
- Stage 2 requires "multi-user updates" — that means different devices/users, not just multi-tab
- Polling update latency would make the app feel laggy
- BroadcastChannel only works same-browser same-device

**Code:**
```typescript
// Optimistic UI: update immediately
store.createCard({ columnId, title, ... });

// Broadcast to other clients
broadcast({ type: "CARD_CREATED", payload: {...} });

// Remote clients receive and apply
store.createCard({ ...payload, skipHistory: true });
```

---

### Decision 3: Flat Comments Over Nested Comments

**Problem:** How to store threaded comments (2+ levels deep)?

❌ **Nested approach:**
```typescript
comment: {
  id: "comment1",
  body: "...",
  replies: [
    { id: "comment2", body: "...", replies: [] }
  ]
}
```

**Cons:**
- Deep cloning needed for edits
- Searching for a comment requires traversal
- Type system requires recursive Comment definition
- Rendering deeply nested is inefficient

✅ **Flat approach (chosen):**
```typescript
commentsById: {
  "comment1": { id, cardId, parentId: null },
  "comment2": { id, cardId, parentId: "comment1" }
},
commentReplyMap: {
  "comment1": ["comment2"]
}
```

**Benefits:**
- O(1) lookup by ID
- Editing: update `commentsById[commentId]` only
- Rendering: iterate `commentReplyMap` at any depth
- History/undo: capture comment object once

---

### Decision 4: Command Pattern for Undo/Redo

**Three patterns considered:**

❌ **Option 1: Action History Pattern** — "store what happened"
- Vague. Doesn't say how to undo.

✅ **Option 2: Command Pattern (chosen)** — Each action knows its inverse
- Used by: Figma, Notion, Linear
- Undo = apply reverse operation
- No full-state cloning

❌ **Option 3: Event Sourcing** — Replay events from beginning
- Overkill. Requires rewriting entire store.
- Conflicts with Zustand architecture.

**Decision:** Command Pattern

**Code:**
```typescript
// User creates a card
store.createCard({ columnId, title });
// Pushes to history:
past: [
  { type: "CREATE_CARD", payload: { card, columnId, index: 0 } }
]

// User presses Ctrl+Z
store.undo();
// Reverses: deleteCard(cardId)
// Moves to future:
past: [],
future: [
  { type: "CREATE_CARD", ... }
]
```

---

### Decision 5: Last-Write-Wins Conflict Resolution

**Question:** What happens if two users edit the same card simultaneously?

**Decision:** Last-write-wins (the most recent event is applied)

**Why:**
- Simplest strategy for client-side store (no conflict tracking)
- Acceptable for a Kanban board-style application where collisions are rare

**Code:**
```typescript
// Two users edit same card title simultaneously
// User A: "Fix Bug" → "Fix Critical Bug" (sent at 100ms)
// User B: "Fix Bug" → "Investigate Bug" (sent at 105ms)

// Receiving clients apply whatever arrives last
// Result: potential inconsistency (but documented)
```

**Upgrade path:** CRDTs (Yjs) for automatic conflict resolution.


---

### Decision 6: skipHistory Flag for Remote Events

**Problem that emerged:** When User B's move arrives on User A's screen, `pushHistory()` was called, letting User A undo User B's action.

**Solution:** Add `skipHistory?: boolean` flag

```typescript
// Local action — push to undo
store.createCard({ columnId, title });
// → pushHistory() called

// Remote action — DON'T push to undo
store.createCard({ columnId, title, skipHistory: true });
// → pushHistory() skipped
```

**Principle:** Users can only undo their own actions. Remote actions are invisible to undo/redo.

---

### Decision 7: dnd-kit Over Custom Drag & Drop

**Analysis in docs/tradeoff-analysis.md**

**Custom DnD would require:**
- Pointer event handling (pointerdown, pointermove, pointerup)
- Drag preview handling
- Drop zone detection with getBoundingClientRect()
- Touch event handling
- Keyboard accessibility (Space to pick, arrows to move)
- Event cleanup (prevent memory leaks)
- Cross-column dragging logic
- Auto-scroll on edges

**dnd-kit provides:**
- All of the above out of the box
- Battle-tested (used by Vercel, Linear)
- Built-in keyboard DnD
- Built-in touch support

**Trade-off:**
- Custom: Full control, zero dependencies
- dnd-kit: Reliability, accessibility, time

**Decision:** dnd-kit

**Why:** A Kanban board is exactly what dnd-kit was designed for. The reliability + accessibility + time savings outweigh control.

---

### Decision 8: Layered Architecture (Actions → Slices → Store)

**Three-layer pattern:**

```
Pure Action Functions
↓
Zustand Slices (Wiring)
↓
Store Assembly
```

**Why:**
- **Separation of concerns:** Logic is decoupled from store library
- **Testability:** Pure functions are easy to test
- **Portability:** If we swap Zustand for Redux, only slices change
- **Reusability:** Same action can be called from WebSocket, undo/redo, or API

**Code:**
```typescript
// Layer 1: Pure function (no Zustand)
export function createCard(state, payload) {
  return { cardsById: {...}, columnCardMap: {...} };
}

// Layer 2: Zustand wiring
export function createCardSlice(set, get) {
  return {
    createCard: (payload) => {
      const updates = createCard(get(), payload);
      set(updates, false, "card/createCard");
      get().pushHistory({...});
    }
  };
}

// Layer 3: Assembly
export const useStore = create((set, get) => ({
  ...createCardSlice(set, get),
  ...createCommentSlice(set, get),
}));
```

---

### Decision 9: localStorage + Pusher (Not Database)

**Current approach:**
- localStorage as single-source-of-truth per browser
- Pusher broadcasts *changes* across browsers
- Multiple tabs in same browser share localStorage

**Limitation:** Different users on different computers start with different initial data

**Upgrade path:** Replace localStorage with Supabase (database upgrade)
- All users load same initial state from server
- Pusher still broadcasts changes
- Single source of truth across all clients

---

## Summary: Core Principles

This architecture is built on five core principles:

1. **Normalization** — Flat state shape, O(1) lookups, minimal cloning
2. **Separation of Concerns** — Domain logic knows nothing about Zustand, Pusher, or localStorage
3. **Optimistic UI** — Update state immediately, broadcast async, rollback on error
4. **Transparent Tradeoffs** — Last-write-wins documented, dnd-kit analysis published, tech debt listed
5. **Scalability by Design** — Each Stage 2 feature added without rewriting foundation

These decisions enable the system to scale from Stage 1 (basic CRUD) to Stage 2 (real-time collaboration) and beyond (10,000 users) with clear upgrade paths, not rewrites.

---

## Testing Strategy

- **19 unit tests** covering pure action functions (drag, undo/redo, comments)
- **1 integration test** simulating full board workflow (create → move → delete)
- **Performance profiling** with React DevTools (210 cards at 45–55ms)
- **Manual testing** across multiple browsers and devices with Pusher

---

## Reference Files

- docs/architecture-evolution.md
- docs/tradeoff-analysis.md
- docs\performance-benchmarking-notes.md (also included here, as per the requirement, 'Include performance notes in README.')

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
