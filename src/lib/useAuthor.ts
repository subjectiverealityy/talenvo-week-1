// useAuthor - manages the commenting username stored in localStorage. The username persists across sessions. The user is prompted once on first comment and can change it at any time via the returned setAuthor function.

import { useState, useCallback } from "react";

const AUTHOR_KEY = "comment_author";

function getStoredAuthor(): string {
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

  const setAuthor = useCallback((name: string) => {
    const trimmed = name.trim();
    saveAuthor(trimmed);
    setAuthorState(trimmed);
  }, []);

  const promptForAuthor = useCallback((): string | null => {
    const name = window.prompt("What name would you like to comment as?")?.trim() ?? "";
    if (!name) return null;
    setAuthor(name);
    return name;
  }, [setAuthor]);

  return { author, setAuthor, promptForAuthor };
}