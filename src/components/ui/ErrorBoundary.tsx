"use client";

// ErrorBoundary - catches runtime errors in the component's subtree and renders fallback UI instead of crashing the entire page.

import { Component, type ReactNode, type ErrorInfo } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-8 text-center"
        >
          <p className="text-sm font-medium text-gray-700 mb-1">
            Something went wrong.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Try refreshing the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}