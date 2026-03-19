import React from 'react';

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className ?? ''}`} />
  );
}

const COLUMNS = [
  { titleW: 'w-1/2', cards: ['w-11/12', 'w-3/5', 'w-3/4', 'w-1/2'] },
  { titleW: 'w-2/5', cards: ['w-4/5', 'w-11/12'] },
  { titleW: 'w-3/5', cards: ['w-3/5', 'w-11/12', 'w-1/2'] },
];

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
      <div className="flex-1 overflow-hidden" aria-hidden="true">
        <div className="flex gap-4 p-6 h-full overflow-x-auto items-start">
          {COLUMNS.map((col, ci) => (
            <div
              key={ci}
              className="bg-gray-100 border border-gray-200 rounded-lg p-4 w-64 min-w-[18rem] shrink-0 flex flex-col gap-3"
            >
              {/* Column title */}
              <Skeleton className={`h-4 ${col.titleW}`} />

              {/* Card skeletons */}
              <ul className="flex flex-col gap-2">
                {col.cards.map((cardW, ki) => (
                  <li
                    key={ki}
                    className="bg-white border border-gray-200 rounded p-3 flex flex-col gap-2"
                  >
                    <Skeleton className={`h-3.5 ${cardW}`} />
                    {/* Description line on alternating cards */}
                    {ki % 2 === 0 && <Skeleton className="h-3 w-4/5" />}
                    {/* Tags on first card only */}
                    {ki === 0 && (
                      <div className="flex gap-1 mt-1">
                        <Skeleton className="h-4 w-12 rounded-full" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {/* Add card button */}
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}