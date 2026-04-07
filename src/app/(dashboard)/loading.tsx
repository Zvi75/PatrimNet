import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonKPIRow } from "@/components/ui/skeleton-table";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <SkeletonKPIRow count={5} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
