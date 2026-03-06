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