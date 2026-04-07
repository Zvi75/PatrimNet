import { requireWorkspace } from "@/lib/auth";
import { listAssets } from "@/lib/notion/assets";
import { listLeases } from "@/lib/notion/leases";
import { listLoans } from "@/lib/notion/loans";
import { ReportsList } from "@/components/reports/reports-list";

export const metadata = { title: "Rapports" };

export default async function ReportsPage() {
  const ctx = await requireWorkspace();

  const [assets, leases, loans] = await Promise.all([
    listAssets(ctx.workspaceId),
    listLeases(ctx.workspaceId),
    listLoans(ctx.workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rapports & Exports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Génération simultanée PDF + Word (.docx) + Excel (.xlsx)
        </p>
      </div>
      <ReportsList assets={assets} leases={leases} loans={loans} />
    </div>
  );
}
