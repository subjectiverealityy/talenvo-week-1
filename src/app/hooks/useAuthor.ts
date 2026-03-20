// useAuthor - manages the commenting username stored in localStorage. The username persists across sessions. The user is prompted to provide a name value when they attempt to make their first comment and the user can change it at any time via the "change" button in CommentSection.

import { useState, useCallback, useRef } from "react";

const AUTHOR_KEY = "comment_author";

function getStoredAuthor(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(AUTHOR_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveAuthor(name: string): void {
  try {
    localStorage.setItem(AUTHOR_KEY, name);
  } catch {
    // storage unavailable
  }
}

export function useAuthor() {
  const [author, setAuthorState] = useState<string>(getStoredAuthor);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  // resolveRef holds the resolve function of the pending promise so that handleAuthorConfirm / handleAuthorCancel can settle it from outside the hook.
  const resolveRef = useRef<((name: string | null) => void) | null>(null);

  const setAuthor = useCallback((name: string) => {
    const trimmed = name.trim();
    saveAuthor(trimmed);
    setAuthorState(trimmed);
  }, []);

  // promptForAuthor opens the modal and returns a promise that resolves with the entered name, or null if the user cancelled.
  const promptForAuthor = useCallback((): Promise<string | null> => {
    setShowAuthorModal(true);
    return new Promise<string | null>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  // Called by AuthorModal's onConfirm prop.
  const handleAuthorConfirm = useCallback(
    (name: string) => {
      setAuthor(name);
      setShowAuthorModal(false);
      resolveRef.current?.(name);
      resolveRef.current = null;
    },
    [setAuthor]
  );

  // Called by AuthorModal's onCancel prop.
  const handleAuthorCancel = useCallback(() => {
    setShowAuthorModal(false);
    resolveRef.current?.(null);
    resolveRef.current = null;
  }, []);

  return {
    author,
    setAuthor,
    promptForAuthor,
    showAuthorModal,
    handleAuthorConfirm,
    handleAuthorCancel,
  };
}