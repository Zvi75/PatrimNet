import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable, SkeletonKPIRow } from "@/components/ui/skeleton-table";

export default function TransactionsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-40" />
      </div>
      <SkeletonKPIRow count={3} />
      <SkeletonTable rows={8} cols={6} />
    </div>
  );
}
