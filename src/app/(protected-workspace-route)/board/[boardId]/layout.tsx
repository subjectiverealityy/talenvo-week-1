import ErrorBoundary from "@/components/ui/ErrorBoundary";

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-800">
            This board encountered an error while loading.
          </h1>
          <p className="text-sm text-gray-500 max-w-sm">
            Something went wrong while loading this board. Try refreshing the page.
          </p>
          <a
            href="/board-list"
            className="text-sm px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Back to boards
          </a>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}