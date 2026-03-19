function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className ?? ''}`} />
  );
}

export default function Loading() {
  return (
    <main className="p-16 max-w-xl mx-auto" aria-label="Loading boards" aria-busy="true">

      <header className="mb-8">
        <Skeleton className="h-7 w-56 mb-2" />
        <Skeleton className="h-4 w-24" />
      </header>

      <section aria-hidden="true">
        {/* Create button */}
        <Skeleton className="mx-auto mb-8 w-16 h-16 rounded-full" />

        {/* Board card skeletons — mirrors BoardCard layout */}
        <ul className="flex flex-col gap-3">
          {(['w-4/5', 'w-3/5', 'w-2/3'] as const).map((titleW, i) => (
            <li
              key={i}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <Skeleton className={`h-4 ${titleW}`} />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="h-7 w-7 ml-4 shrink-0" />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}