"use client";

import { useState } from "react";
import { useWorkspaceContext } from "./store/workspaceStore";
import BoardInputField from "@/components/BoardInputField";

export default function EntryRoute() {
  const { boardsById, boardIds, createBoard } = useWorkspaceContext();
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  function handleCreateBoard() {
    newTitle.trim();
    newDescription.trim();
    if (newTitle.trim() === "") {
      alert("Oops! You can't create a board without a title.");
      return;
    }
    createBoard(newTitle, newDescription);
    // Reset input fields to empty strings
    setNewTitle("");
    setNewDescription("");
  }

  return (
    <div className="p-16">
      <h1 className="text-2xl font-bold mb-4">Welcome to your BoardList</h1>

      <BoardInputField
        value={newTitle}
        onChange={setNewTitle}
        placeholder="Give your new board a name"
      />

      <BoardInputField
        value={newDescription}
        onChange={setNewDescription}
        placeholder="Give your new board a description"
      />
        
      <button
        className="bg-gray-200 border px-4 py-2 rounded mb-4"
        onClick={handleCreateBoard}
      >
        Create Board
      </button>

      <ul>
        {boardIds.map(id => {
          const board = boardsById[id];
          if (!board) return null;
          return (
            <li key={id} className="border p-2 mb-2 rounded">
              {board.title} {board.description} ({board.dateCreated.toLocaleDateString()})
            </li>
          );
        })}
      </ul>
    </div>
  );
}