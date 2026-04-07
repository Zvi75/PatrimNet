import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-3/4" />
        ))}
      </div>
      <div className="rounded-lg border border-slate-200">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-4 border-b border-slate-100 p-3 last:border-0"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4" style={{ width: `${60 + ((r * cols + c) * 17) % 35}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonKPIRow({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
          <Skeleton className="mb-2 h-3 w-20" />
          <Skeleton className="h-7 w-28" />
        </div>
      ))}
    </div>
  );
}
