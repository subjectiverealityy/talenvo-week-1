# Architecture Evolution Document: Stage 1 to Stage 2
## Talenvo Global Residency Programme — Frontend Development Track

---

## Executive Summary

This document covers the architectural evolution of the Collaborative Knowledge Board from Stage 1 (basic board management) to Stage 2 (production-grade collaboration with real-time updates, drag & drop, threaded comments, and undo/redo). As per the requirements, it details what broke when adding real-time functionalty, what changed in the state structure, identified technical debt, what I would refactor with three more weeks and how it would scale to 10,000 users.

The core design principle throughout remained: **separate domain logic from infrastructure concerns**. This principle enabled each Stage 2 feature (real-time sync, drag & drop, comments, undo/redo) to be added without rewriting the state layer or component architecture.

---

## Part 1: What Broke When Adding Real-Time


### Real-Time Update Simulation Requirement 

"Your board must support simulated multi-user updates using WebSocket server (preferred) OR a polling system with conflict resolution logic. Required Behaviors: Card creation, card movement, and comment additions must reflect in multiple open sessions. Implementation: Optimistic UI updates, conflict handling strategy, and reconciliation logic. Documentation: You must document: What happens if two users edit the same card? What wins? Why?"

#### Decision-making

At the end of Stage 1, the only synchronisation mechanism between tabs was a manual refresh.

I considered three approaches:

#### **Option 1: Polling**
Checks localStorage every N seconds and reloads state into the store.

**Pros:**
- No external infrastructure required
- Simple to implement (one interval, one effect)

**Cons:**
- Updates are only visible after the poll interval
- Checks happen constantly even when nothing has changed
- The upgrade path to a real WebSocket involves tearing down the polling system and replacing it with socket listeners

**Decision:** Not chosen. The polling latency would have made the app feel unresponsive.

---

#### **Option 2: BroadcastChannel API**
A native browser API that allows multiple tabs on the same origin to communicate directly.

**Example:**
```javascript
// Tab 1 (sender)
const channel = new BroadcastChannel("board-updates");
channel.postMessage({ type: "CARD_CREATED", cardId: "abc123" });

// Tab 2 (receiver)
const channel = new BroadcastChannel("board-updates");
channel.onmessage = (event) => {
  store.createCard({...event.data.card, skipHistory: true});
};
```

**Pros:**
- Instant updates (no polling interval)
- Only fires when something changes

**Cons:**
- Only works across tabs in the same browser on the same device
- Stage 2 specifically asks for "multi-user updates" - BroadcastChannel only handles multi-tab updates

**Decision:** Not chosen. BroadcastChannel solves the multi-tab problem but not the multi-device problem.

---

#### **Option 3: Pusher (WebSocket Server)**
A managed WebSocket service that works on Vercel without needing a persistent backend server. Events are broadcast to all connected clients in real-time.

**Architecture:**
1. User A creates a card → local state updates immediately (optimistic UI)
2. `broadcast()` sends `{ type: "CARD_CREATED", payload: {...} }` to `/api/pusher`
3. `/api/pusher` uses Pusher's server SDK to trigger the event across all connected clients
4. User B (in a different browser/device) receives the event, applies it to their local store
5. Both users see the same card instantly

**Pros:**
- Real WebSocket service (not a simulation)
- Works across devices and browsers
- Supports all required scenarios: same-device (faster than polling), same-browser (instant like BroadcastChannel), and cross-device (requires real infrastructure)
- Stage 2 specifically says "WebSocket server (preferred)" - this satisfies that
- Event types are transport-agnostic (Pusher can be swapped for Ably or Supabase Realtime later with minimal changes)

**Cons:**
- Requires managed infrastructure (Pusher account)
- localStorage as the persistence layer means different browsers start with different data
  - Example: User A initializes their store from localStorage, User B opens in a new browser (no data), they sync *changes* in real-time but not initial state
  - Resolution: Add a server-side database (Supabase, Firebase). This is outside Stage 2's scope.

**Decision:** Chosen. Pusher satisfies the Stage 2 requirement and the implementation demonstrates both single-tab (basic state) and multi-tab real-time sync in a single browser.

---

### The Real-Time Bug That Emerged

After implementing Pusher, a subtle but serious bug appeared: **incoming WebSocket events were polluting the local undo history**.

**The scenario:**
1. User A creates a card (local action) → `store.createCard()` is called → `pushHistory()` is called → undo stack grows
2. User B moves a card in a different browser → Pusher broadcasts `CARD_MOVED`
3. User A's client receives the event → `store.moveCard()` is called with the payload → **`pushHistory()` is also called**
4. User A can now undo User B's move, which is wrong

The root cause: The store methods did not know the difference between local mutations (which should push history) and remote mutations (which should only update state).

**The fix:** Add an optional `skipHistory?: boolean` flag to `createCard` and `moveCard`:

```typescript
// In cardSlice.ts
createCard: (payload: {
  columnId: string;
  title: string;
  skipHistory?: boolean;  // ← new flag
}) => {
  const updates = createCard(get(), payload);
  set(updates, false, "card/createCard");
  if (payload.skipHistory) return;  // ← skip history push
  const nextState = get();
  // ... push to history
}
```

**In the WebSocket handler:**
```typescript
// In useWebSocket.ts hook
case "CARD_CREATED":
  store.createCard({
    ...data.event.payload,
    skipHistory: true  // ← remote actions don't pollute undo
  });
  break;
```

Remote actions must be excluded from local undo/redo. A user should only be able to undo their own actions, not other users' changes.

---

### Conflict Resolution: "Last-Write-Wins"

**Question: What happens if two users edit the same card simultaneously?**

**Answer: Last-write-wins. The most recently received event is applied directly.**

**Example:**
- Time 0ms: User A and User B both open the same card
- Time 100ms: User A changes title from "Fix Bug" to "Fix Critical Bug" → broadcasts `CARD_EDITED`
- Time 105ms: User B changes title from "Fix Bug" to "Investigate Bug" → broadcasts `CARD_EDITED`
- Time 200ms: User A's client receives User B's event, overwrites A's title with B's title
- Time 205ms: User B's client receives User A's event, overwrites B's title with A's title

Result: **Both users end up seeing different data** - A sees "Investigate Bug", B sees "Fix Critical Bug". This is a data consistency bug and a known limitation. A web application with stronger consistency requirements would not use this strategy, but it works well for this type of application, and meets the Stage 2 requirements.

**Why last-write-wins was chosen (despite the bug):**
1. Two users editing the exact same card at the exact same millisecond is rare - an edge case
2. Implementing a correct solution requires either **operational transforms** or **CRDTs**, both of which require a significant rewrite

---

## Part 2: What Changed in the State Architecture

At the end of Stage 1, the application used React's built-in `useReducer` hook wrapped in a custom context provider:

```typescript
// Stage 1 pattern
const [state, dispatch] = useReducer(boardReducer, initialState);
<StoreContext.Provider value={{state, dispatch}}>
  {children}
</StoreContext.Provider>
```

The state was normalised with `boardsById`, `columnsById`, `cardsById`, and order-preserving maps like `boardColumnMap` and `columnCardMap`. This prevented deeply nested state and enabled O(1) lookups.

**Why it worked for Stage 1:**
- The reducer was simple (create/edit/delete for boards, columns, cards)
- Components could read and update without needing external infrastructure
- localStorage serialization was straightforward

**Why another solution was considered:**
- No built-in devtools integration (manual integration integrate Redux DevTools)
- Custom localStorage persistence layer (manual JSON serialization and date revival)
- Adding features like real-time, undo/redo, comment threads would have added more cases to an already complex reducer, with no natural way to separate concerns

---

### Stage 2 State Architecture: Zustand + Slices

I migrated to **Zustand** (a lightweight state library) with a layered architecture:

```
Domain Types (src/types/index.ts)
  ↓
Store Types (src/store/types.ts)
  ↓
Pure Actions (src/store/actions/*.ts)
  ↓
Zustand Slices (src/store/slices/*.ts)  [wiring layer]
  ↓
Store Assembly (src/store/store.ts)
```

#### **Layer 1: Domain Types**
```typescript
// src/types/index.ts
export type Board = {
  id: string;
  title: string;
  description: string;
  dateCreated: Date;
};

export type Card = {
  id: string;
  columnId: string;
  title: string;
  description: string;
  tags: string[];
  dueDate: Date | null;
};

export type Comment = {
  id: string;
  cardId: string;
  parentId: string | null;  // null for top-level, comment ID for replies
  author: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
};
```

These are pure data types with no business logic. They describe the domain, not how we store or retrieve the data.

---

#### **Layer 2: Store Types**
```typescript
// src/store/types.ts
export type PersistedState = {
  boardsById: Record<string, Board>;
  boardIds: string[];
  columnsById: Record<string, Column>;
  boardColumnMap: Record<string, string[]>;  // boardId → [colId1, colId2, ...]
  cardsById: Record<string, Card>;
  columnCardMap: Record<string, string[]>;   // columnId → [cardId1, cardId2, ...]
  commentsById: Record<string, Comment>;
  cardCommentMap: Record<string, string[]>;  // cardId → [topLevelCommentIds]
  commentReplyMap: Record<string, string[]>; // commentId → [replyIds]
};

export type VisualState = {
  activeCardId: string | null;
};

export type RealtimeEvent =
  | { type: "CARD_CREATED"; payload: {...} }
  | { type: "CARD_MOVED"; payload: {...} }
  | { type: "COMMENT_ADDED"; payload: {...} }
  | { ... more events ... };

export type Action =
  | { type: "CREATE_BOARD"; payload: {...} }
  | { type: "CREATE_CARD"; payload: {...} }
  | { type: "MOVE_CARD"; payload: {...} }
  | { ... all possible actions ... };
```

**Why separate types?** Domain types are what the user creates (a board, a card). Store types are how we organize them for fast queries. Separating them makes it clear what the API expects vs. what the store provides.

---

#### **Layer 3: Pure Action Functions**
```typescript
// src/store/actions/cardActions.ts
export function createCard(
  state: PersistedState,
  payload: {
    columnId: string;
    title: string;
    description?: string;
    tags?: string[];
    dueDate?: Date | null;
  }
): Partial<PersistedState> {
  const cardId = crypto.randomUUID();
  const card: Card = {
    id: cardId,
    columnId: payload.columnId,
    title: payload.title,
    description: payload.description ?? "",
    tags: payload.tags ?? [],
    dueDate: payload.dueDate ?? null,
  };

  return {
    cardsById: { ...state.cardsById, [cardId]: card },
    columnCardMap: {
      ...state.columnCardMap,
      [payload.columnId]: [...(state.columnCardMap[payload.columnId] ?? []), cardId],
    },
  };
}

export function moveCard(
  state: PersistedState,
  payload: {
    cardId: string;
    sourceColumnId: string;
    destinationColumnId: string;
    newIndex: number;
  }
): Partial<PersistedState> {
  const sourceCards = state.columnCardMap[payload.sourceColumnId] ?? [];
  const destCards = state.columnCardMap[payload.destinationColumnId] ?? [];

  return {
    cardsById: {
      ...state.cardsById,
      [payload.cardId]: { ...state.cardsById[payload.cardId], columnId: payload.destinationColumnId },
    },
    columnCardMap: {
      ...state.columnCardMap,
      [payload.sourceColumnId]: sourceCards.filter(id => id !== payload.cardId),
      [payload.destinationColumnId]: [...destCards.slice(0, payload.newIndex), payload.cardId, ...destCards.slice(payload.newIndex)],
    },
  };
}
```

**Key principle: These are pure functions.** They take state and a payload, return a partial state object. This means:
- They are **independently testable** 
- They are **reusable** 
- They are **transport-agnostic** (the transport layer i.e. Zustand can be swapped out but core logic does not change)

---

#### **Layer 4: Zustand Slices**
```typescript
// src/store/slices/cardSlice.ts
export function createCardSlice(
  set: (partial: Partial<PersistedState>) => void,
  get: () => PersistedState
) {
  return {
    createCard: (payload: {
      columnId: string;
      title: string;
      skipHistory?: boolean;
    }) => {
      const updates = createCard(get(), payload);
      set(updates, false, "card/createCard");
      if (payload.skipHistory) return;
      // Push to undo history
      const nextState = get();
      const cardId = nextState.columnCardMap[payload.columnId].at(-1)!;
      const createdCard = nextState.cardsById[cardId];
      nextState.pushHistory({
        type: "CREATE_CARD",
        payload: { card: createdCard, columnId: payload.columnId, index: 0 },
      });
    },

    moveCard: (payload: {
      cardId: string;
      sourceColumnId: string;
      destinationColumnId: string;
      newIndex: number;
      skipHistory?: boolean;
    }) => {
      const state = get();
      const updates = moveCard(state, payload);
      set(updates, false, "card/moveCard");
      if (payload.skipHistory) return;
      // Push to undo history with inverse operation...
    },
  };
}
```

The slice is a wiring layer that "wires up" the pure action function to Zustand. It handles:
- Calling `set()` to update the store
- Calling `get()` to read the next state (if needed)
- Pushing to the undo history
- Calling `broadcast()` to publish remote events

**Why this separation?** If we ever need to replace Zustand with Redux or TanStack Query, we only rewrite the slice. The action functions, types, and subscriptions stay the same.

---

#### **Layer 5: Store Assembly**
```typescript
// src/store/store.ts
export const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultState,
        ...createBoardSlice(set, get),
        ...createColumnSlice(set, get),
        ...createCardSlice(set, get),
        ...createHistorySlice(set, get),
        ...createCommentSlice(set, get),
      }),
      {
        name: "app_v1",
        storage: createJSONStorage(() => localStorage, {
          reviver: (key, value) => {
            if ((key === "dateCreated" || key === "dueDate" || key === "editedAt" || key === "createdAt") && typeof value === "string") {
              const parsed = new Date(value);
              return Number.isNaN(parsed.getTime()) ? value : parsed;
            }
            return value;
          },
        }),
        partialize: (state) => ({
          boardsById: state.boardsById,
          boardIds: state.boardIds,
          columnsById: state.columnsById,
          boardColumnMap: state.boardColumnMap,
          cardsById: state.cardsById,
          columnCardMap: state.columnCardMap,
          commentsById: state.commentsById,
          cardCommentMap: state.cardCommentMap,
          commentReplyMap: state.commentReplyMap,
        }),
      }
    ),
    { name: "AppStore" }
  )
);
```

This brings everything together:
- **devtools middleware:** Enables Redux DevTools integration
- **persist middleware:** Handles localStorage serialization and deserialization
- **partialize:** Excludes visual state from persistence (activeCardId does not survive refresh)
- **reviver:** Converts JSON date strings back to Date objects on hydration

#### **Why Zustand?**

| Concern | useReducer + Context | Zustand |
|---------|---------------------|---------|
| Devtools | Manual setup | Built-in |
| localStorage | Custom layer | Built-in persist middleware |
| Component subscription | Context consumers (or hooks) | Selector-based (no prop drilling) |
| Reading store outside components | Not possible | `useStore.getState()` anywhere |
| TypeScript support | Good | Excellent |
| Bundle size | Smaller | ~2KB more |

For Stage 2, where we need WebSocket listeners that update the store outside components, Redux DevTools for debugging, and localStorage with date revival, Zustand was the pragmatic choice.

---

### New State Added in Stage 2: Comments

**Comment Structure:**

```typescript
commentsById: Record<string, Comment> = {
  "comment1": { id: "comment1", cardId: "card1", parentId: null, author: "Alice", body: "...", ... },
  "comment2": { id: "comment2", cardId: "card1", parentId: "comment1", author: "Bob", body: "...", ... }, // reply to comment1
}

cardCommentMap: Record<string, string[]> = {
  "card1": ["comment1"],  // only top-level comments
}

commentReplyMap: Record<string, string[]> = {
  "comment1": ["comment2"],  // comment1 has one reply
}
```

**Why flat instead of nested?**

❌ **Nested approach:**
```typescript
commentsById: {
  "comment1": {
    id: "comment1",
    body: "...",
    replies: [
      { id: "comment2", body: "...", replies: [] }
    ]
  }
}
```

Problems:
- Deleting a reply means traversing nested structures to find it
- Editing a reply means deep cloning to avoid mutating the store
- Rendering deeply nested arrays is inefficient
- Type safety requires recursive Comment types

✅ **Flat approach (chosen):**
```typescript
commentsById: { "comment1": {...}, "comment2": {...} }
commentReplyMap: { "comment1": ["comment2"] }
```

Benefits:
- O(1) lookup to get any comment by ID
- `deleteComment` removes from `commentsById` and its `parentId`'s `commentReplyMap` - no traversal
- Rendering can iterate at any depth: `cardCommentMap → commentReplyMap → commentReplyMap` (no nesting in the render logic)
- Type safety is simple (Comment type does not reference itself)
- History/undo is straightforward (capture the comment object once, restore it once)

The flat structure is how Google Sheets, GitHub, and Linear store their threaded comments internally.

---

### New State Added in Stage 2: History (Undo/Redo)

```typescript
export type HistoryState = {
  past: HistoryAction[];
  future: HistoryAction[];
};

export type HistoryAction =
  | {
      type: "CREATE_CARD";
      payload: { card: Card; columnId: string; index: number };
    }
  | {
      type: "DELETE_CARD";
      payload: { card: Card; columnId: string; index: number };
    }
  | {
      type: "MOVE_CARD";
      payload: {
        cardId: string;
        fromColumnId: string;
        toColumnId: string;
        fromIndex: number;
        toIndex: number;
      };
    };
```

**The Command Pattern:**

Undo/redo is implemented using the **Command Pattern** - each action is a command object that knows how to be reversed.

Example: User creates a card at index 0 in Column A.

**Forward operation:**
```typescript
{ type: "CREATE_CARD", payload: { card: {...}, columnId: "colA", index: 0 } }
```

**Undo (reverse) operation:**
```typescript
// Reverse of CREATE_CARD is DELETE_CARD with the same card
deleteCard(state, { cardId: card.id })  // removes it from store
```

**Why the Command Pattern?**

Three patterns were considered:

1. **Action History Pattern** — "just store what happened"
   - Records what happened but gives no clear answer for how to reverse it
   - Inverse logic is manually written

2. **Command Pattern** — each action is a command that knows its inverse ✅
   - Inverse operations are O(1) — no full-state replays
   - Each command captures just the data needed to reverse it
   - Used by: Figma, Notion, Linear, Photoshop

3. **Event Sourcing** — replay all events from the beginning to derive current state
   - Conflicts with how Zustand works
   - Too heavyweight for this architecture
   - Requires rewriting the entire store

**Command Pattern was selected** because it requires no architectural changes and is the industry standard for undo/redo.

---

<!-- ## Part 3: Known Technical Debt

### 1. localStorage as a Single-User Persistence Layer

**The problem:** State is stored per-browser. User A on Chrome and User B on Firefox each have their own isolated localStorage - they start with completely different data and only see each other's *changes* in real time via Pusher, not each other's *initial state*.

**Example failure mode:**
1. User A opens the app in Chrome for the first time → localStorage is empty, 0 boards
2. User A creates Board X → stored in Chrome's localStorage
3. User B opens the app in Firefox for the first time → localStorage is empty, 0 boards
4. Pusher broadcasts Board X to User B → User B now sees Board X
5. User B creates Board Y → stored in Firefox's localStorage
6. Pusher broadcasts Board Y to User A → User A now sees both X and Y
7. User B refreshes Firefox → Board Y reappears (from localStorage), Board X disappears (not in localStorage)

**Solution:** Add a backend database. On app initialization, fetch all boards from the server instead of relying on localStorage. Both users load the same initial state from a single source of truth.

### localStorage as Single

**The problem:** User B opens the app for the first time in a new browser - localStorage is empty so they see no boards. User A has already created several boards. User B doesn't see them because Pusher only delivers new events/changes from the moment two clients are connected, not historical state. User B misses all the events that happened before being connected to User A.

**The problem:** This is per-browser. User A on Chrome loads one set of boards. User B on Firefox loads different boards. They are completely isolated until Pusher syncs *changes*.

**Example failure mode:**
1. User A opens the webapp in Chrome → loads 0 boards from localStorage (first time)
2. User A creates Board X
3. User B opens the webapp in Firefox → loads 0 boards from localStorage (first time)
4. Pusher broadcasts Board X to User B
5. User B sees Board X (because of Pusher)
6. User B creates Board Y
7. Pusher broadcasts Board Y to User A
8. User A now sees both X and Y
9. User B refreshes Firefox → Board Y reappears (from localStorage), Board X disappears (not in localStorage)

Solution: Add a backend database (S. On webapp initialization, fetch all boards from the server instead of relying on localStorage.

---
 -->
## Part 4: What I Would Refactor with 3 More Weeks

### 1. Server-Side Data Layer

**Goal:** Replace localStorage with a real database.

**Implementation:** Migrate from localStorage to **Supabase** (managed PostgreSQL + real-time subscriptions).

**Changes:**
- Create tables: `boards`, `columns`, `cards`, `comments`
- Update `store.ts` persist configuration to fetch from Supabase on init instead of localStorage
- Update `broadcast()` to write to Supabase API instead of Pusher only
- Real-time subscriptions from Supabase automatically broadcast to all clients

**Impact:**
- Eliminates the "different browsers have different initial data" problem
- Enables Server Components and SSR (faster initial page load)
- Removes the client-side data consistency problem - all clients load the same state from a single source of truth

**Code changes:** Most changes will be in `store.ts` and `useWebSocket.ts`. The action functions and slices are unchanged.

---

### 2. Card Modal URL Routing

**Goal:** Make open cards linkable and shareable.

**Current flow:**
```
User opens card → activeCardId in store → modal renders
User refreshes → activeCardId is lost (not persisted)
```

**Desired flow:**
```
User opens card → URL changes to /board/[boardId]/card/[cardId]
User refreshes → Next.js re-renders the page with the card modal open
User shares the URL → Recipient opens the card directly
```

**Implementation:** Use Next.js App Router's **Parallel Routes** (`@modal` slot):
```
app/
  board/
    [boardId]/
      page.tsx           (main board)
      @modal/            (parallel route)
        card/
          [cardId]/
            page.tsx     (card modal)
```

**Why this requires a database:** Without a database, a shared URL would silently fail if the recipient's localStorage does not contain that board. With Supabase, the server renders the card modal using data fetched from the database.

---

### 3. Authentication

**Goal:** Build a real signup/login flow.

**Current state:** 
- The login and signup routes exist with placeholder UI but are not yet functional.
- There is an "Author Modal" that prompts for a name, but there is no real user identity.

**Changes:**
- Implement signup (email/password)
- Implement login (email/password)
- Add a real user session (store user ID, not just a name)
- Update comments to store `userId` instead of `author` string
- Update real-time events to carry `userId` for proper attribution
- For author names, we would store a `userId` and look it up dynamically, allowing user name changes to affect past and future comments

**Impact:** 
- Comments show real author information
- Board access control becomes possible (private vs shared boards)
- Proper user identity for real-time sync

---

### 4. Performance Optimizations

#### **Evaluate: List Virtualization + Drag & Drop**
- Profile with 500+ cards to see if virtualization is needed
- Do research on `pragmatic-drag-and-drop` by Atlassian (designed to work with virtualized lists)
- If the results of the new performance stress test justify it, replace dnd-kit with pragmatic-drag-and-drop

---

## Part 5: How I would scale this to 10,000 Users

The current architecture **does not scale** to 10,000 concurrent users without substantial changes. Here is what needs to evolve:

### 1. Persistence: localStorage → Database

**Current limit:** Single-browser, single-user
**Constraint:** localStorage is ~5–10MB

**At 10,000 users:**
- You need a multi-user, multi-device database
- PostgreSQL hosted on Supabase, Firebase, or self-hosted
- Each user gets their own set of boards/cards/comments
- The pure action functions become server-side API handlers (minimal rewrite)

### 2. Real-Time: Pusher → Dedicated Infrastructure or Pusher's Paid Plans

**Current limit:** Pusher free tier = 100 concurrent connections
**Constraint:** Stage 2 requirement met with Pusher free tier

**At 10,000 users:**
- Option A: Pusher's paid plans (supports 10K+ concurrent connections)
- Option B: Self-hosted WebSocket server (Socket.io, Ably)
- Option C: Supabase Realtime (built into Supabase)

**Code change:** Only `useWebSocket.ts` changes. Event types, store calls, and subscriptions stay the same.

### 3. Conflict Resolution: Last-Write-Wins → Operational Transforms or CRDTs

**Current conflict strategy:** Last-write-wins (simple but can result in data loss)
**Constraint:** Acceptable for Stage 2 (low collision probability)

**At 10,000 concurrent users:** Multiple users editing shared cards simultaneously becomes more common.

**Solution:**

#### **Conflict-free Replicated Data Types (CRDTs)**
- Data structures that automatically merge concurrent edits without conflicts
- User A's change and User B's change both apply, merged correctly
- Implementation complexity: Use a battle-tested library rather than implementing from scratch
- Library recommendation: Yjs is production-ready and used by Figma, Notion, etc.

---

### 4. Rendering Performance: No Virtualization → Virtualized Lists

**Current bottleneck:** Rendering all DOM nodes simultaneously may negatively affect performance at card counts beyond the Stage 2 testing requirement of 200+ cards and 20+ columns.
**Constraint:** Solved with `memo()` and `useShallow` for Stage 2

**At 10,000 users** (each user might have 100+ cards per board):
- Virtualizing the list is necessary (so that only visible cards render)
- Standard library: `@tanstack/react-virtual`
- Known blocker: dnd-kit requires all sortable items to be mounted

**The conflict:** 
- dnd-kit calculates drag positions using `getBoundingClientRect()` on all items
- Virtual lists unmount items outside the viewport
- Unmounted items have no bounding rect so dnd-kit cannot detect where to drop cards

**Solution:** Replace dnd-kit with `pragmatic-drag-and-drop` by Atlassian
- Designed to work with virtualized lists
- Used in production Jira (which has millions of weekly active users)
- API is similar to dnd-kit, so the migration is low-risk

---

### 5. Caching and Server-Side Rendering

**Current rendering:** Client-side only (board data fetched after hydration)
**Problem:** Slow initial page load, hydration mismatch risk

**At 10,000 users:**
- Use Next.js Server Components to fetch board data on the server
- Cache frequently accessed boards with Redis
- Stream the initial board state directly in the HTML
- Result: Initial paint happens faster

---

## Conclusion

The path to scaling 10,000 users is likely to involve: 
- database 
- CRDT-based conflict resolution
- virtualized lists 
- server-side rendering

None of these require replacing the core state architecture or action functions - they only involve only adapting infrastructure layers.