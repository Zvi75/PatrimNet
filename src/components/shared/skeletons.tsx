import { Skeleton } from "@/components/ui/skeleton";

export function KPISkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="mb-2 h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function EntityListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function AssetListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
          <Skeleton className="mb-3 h-5 w-40" />
          <Skeleton className="mb-2 h-4 w-56" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LeaseListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4">
        <Skeleton className="h-5 w-32" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-slate-50 px-4 py-3 last:border-0"
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="ml-auto h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-5 gap-4 border-b border-slate-50 px-4 py-3 last:border-0">
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
