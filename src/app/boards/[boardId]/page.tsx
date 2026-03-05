"use client";

import { useParams, useRouter } from "next/navigation";
import { useWorkspaceContext } from "../../store/workspaceStore";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const { boardsById } = useWorkspaceContext();

  const board = boardsById[boardId];

  if (!board) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">The board doesn't exist.</p>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-500 hover:text-gray-900 mt-2"
        >
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      <header className="flex items-center gap-4 p-6 border-b justify-between">
        <button
          onClick={() => router.push("/")}
          aria-label="Go back"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back
        </button>
        <div className="text-right">
          <h1 className="text-xl font-bold">{board.title}</h1>
          {board.description && (
            <p className="text-sm text-gray-500 mt-0.5">{board.description}</p>
          )}
        </div>
      </header>

      <div className="p-6">
        <p className="text-sm text-gray-400">You haven't created any columns yet.</p>
      </div>
    </div>
  );
}