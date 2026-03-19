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