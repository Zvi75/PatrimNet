import { Skeleton } from "@/components/ui/skeleton";

export default function AILoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
