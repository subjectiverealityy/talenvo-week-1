# Drag and Drop Tradeoff Analysis
## Custom Implementation vs dnd-kit

---

## The Decision

I used **dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`) for the drag and drop system. The alternative was building a custom implementation from scratch using the browser's Pointer Events API.

---

## Custom Drag and Drop

### What it would involve

A production-quality custom DnD implementation requires building from scratch:

- **Pointer event handling** — `pointerdown`, `pointermove`, `pointerup` listeners with proper capture and cleanup
- **Drag preview** — a ghost element that follows the pointer, cloned from the dragged element or custom-rendered
- **Drop zone detection** — calculating which column or position the pointer is over using `getBoundingClientRect()` and intersection logic
- **Cross-column dragging** — detecting when the pointer crosses a column boundary and updating the target column
- **Scroll handling** — auto-scrolling the board horizontally and columns vertically when dragging near edges
- **Touch support** — separate touch event handling or unified pointer events across devices
- **Keyboard DnD** — full keyboard navigation for accessibility (Space to pick up, arrow keys to move, Enter/Space to drop, Escape to cancel)
- **Event cleanup** — removing all listeners on drop, cancel, or unmount to prevent memory leaks

### Pros

- Full control over behaviour and animations
- No third-party dependency
- Smaller bundle size

### Cons

- Significant implementation time — each of the above items is non-trivial, and edge cases compound quickly
- Easy to get wrong — nested drop zones, auto-scrolling, and cross-column dragging are notoriously difficult
- Keyboard DnD (moving cards without a mouse) is very hard to implement correctly and is a hard accessibility requirement under WCAG 2.1
- A production-quality custom implementation is a weeks-long project independent of all other Stage 2 requirements

---

## dnd-kit

### What it provides

dnd-kit is a modular drag and drop toolkit used in production by Vercel, Linear, and others. It handles:

- Pointer, mouse, touch, and keyboard sensors out of the box
- `DragOverlay` for a smooth drag preview that is not constrained by parent overflow or z-index
- `SortableContext` + `useSortable` for sortable lists with correct ordering logic
- Built-in keyboard DnD — users can drag cards without a mouse, with screen reader announcements
- Collision detection strategies (`closestCorners`, `closestCenter`, `rectIntersection`) that can be customised or composed
- Activation constraints (e.g. `distance: 5`) to distinguish clicks from drag gestures
- Full TypeScript support

### Pros

- Production-ready and battle-tested
- Accessibility built in — keyboard dragging and screen reader support work out of the box
- Touch support built in
- Highly composable — integrates naturally with the normalised Zustand state shape
- `useSortable` maps directly to the card data structure — `id`, `data.columnId`, `transform`, `transition`
- Active maintenance and thorough documentation

### Cons

- Third-party dependency — adds to bundle size
- Some learning curve around the sensor and modifier system
- Known conflict with list virtualisation — dnd-kit requires all sortable items to be mounted in the DOM to calculate drag positions, which prevents virtualising long lists

---

## Decision

A Kanban board is exactly the use case dnd-kit was designed for. The tradeoff is:

**Custom DnD:** control and zero dependencies  
**dnd-kit:** time, reliability, and accessibility

For a project at this scale and timeline, dnd-kit wins clearly. Building a custom implementation to production quality would consume more time than all other Stage 2 requirements combined — and the result would still be less accessible, less touch-friendly, and more fragile than the library.

---

## State Update Strategy

Regardless of which DnD approach is used, the state update logic is the same:

**On drag end — same column:**
- Remove the card from its current index in `columnCardMap[columnId]`
- Insert it at the new index
- Only the affected column's array changes

**On drag end — different columns:**
- Remove the card ID from `columnCardMap[sourceColumnId]`
- Insert it into `columnCardMap[destinationColumnId]` at the target index
- Update `card.columnId` on the card itself
- Only the two affected columns' arrays and the moved card change

**Optimistic updates:** State is updated immediately on drag end before the mock API call resolves. If the API call fails, a toast error is shown. In a production system, a failed API call would trigger a rollback to the pre-drag state.

**Ordering persistence:** Card order is stored in `columnCardMap` as an ordered array of IDs. This is the source of truth for rendering order. The array is updated atomically on every move — no ordering drift between the UI and the store.

---

## Future Consideration

If card counts grow to the point where list virtualisation becomes necessary, `pragmatic-drag-and-drop` by Atlassian (used in production Jira) would be evaluated as a replacement. It is specifically designed to work alongside virtualised lists where dnd-kit cannot.