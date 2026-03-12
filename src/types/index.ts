// Domain Types file - the single source of truth for all core data structures (Board, Column, Card) in the app. It defines the shape of core data.

// Every file in the codebase that needs to know what a Board, Column, or Card looks like imports from here.

// The fact that this is a pure type definition file with no imports/dependencies means every file can safely depend on it (it is at the bottom of the dependency graph) and the types are not coupled to implementation details/concerns.

export type Board = {
  id: string;
  title: string;
  description: string;
  dateCreated: Date;
};

export type Column = {
  id: string;
  title: string;
  boardId: string;
};

export type Card = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  dueDate: Date | null;
  columnId: string;
};