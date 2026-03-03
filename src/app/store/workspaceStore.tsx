"use client";

import { createContext, useContext, useState, ReactNode, JSX } from "react";

// Board type
type Board = {
  id: string;
  title: string;
  description: string;
  dateCreated: Date;
};

// Context type
type WorkspaceContextType = {
  boardsById: Record<string, Board>;
  boardIds: string[];
  createBoard: (title: string, description?: string) => void;
};

// Workspace context
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Workspace provider 
type WorkspaceProviderProps = { children: ReactNode };

export const WorkspaceProvider = ({ children }: WorkspaceProviderProps): JSX.Element => {
  const [boardsById, setBoardsById] = useState<Record<string, Board>>({});
  const [boardIds, setBoardIds] = useState<string[]>([]);

  // A function for generating an ID, creating a board object, and updating global state
  const createBoard = (title: string, description: string = ""): void => {
    const newId = Date.now().toString();
    const newBoard = { id: newId, title, description, dateCreated: new Date() };
    setBoardsById(prev => ({...prev, [newId]: newBoard}));
    setBoardIds(prev => [...prev, newId]);
  };

  return (
    <WorkspaceContext.Provider value={{ boardsById, boardIds, createBoard }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspaceContext = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspaceContext must be used within a WorkspaceProvider");
  }
  return context;
};