function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className ?? ''}`} />
  );
}

export default function BoardLoading() {
  return (
    <div className="flex flex-col h-screen" aria-label="Loading board" aria-busy="true">

      <header className="flex items-center p-6 border-b border-gray-200 shrink-0 justify-between">
        <Skeleton className="h-4 w-12" />
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </header>

      {/* Add Column button */}
      <div className="px-6 pt-4 shrink-0">
        <Skeleton className="h-9 w-32" />
      </div>
      
      {/* Board canvas */}
      <div className="flex-1 overflow-hidden" aria-hidden="true" />
    </div>
  );
}