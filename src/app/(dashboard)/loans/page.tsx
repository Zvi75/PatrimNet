import { requireWorkspace } from "@/lib/auth";
import { listLoans } from "@/lib/notion/loans";
import { listAssets } from "@/lib/notion/assets";
import { listLegalEntities } from "@/lib/notion/legal-entities";
import { listLeases } from "@/lib/notion/leases";
import { LoanListView } from "@/components/loans/loan-list-view";
import { CreateLoanButton } from "@/components/loans/create-loan-button";

export const metadata = { title: "Emprunts" };

export default async function LoansPage() {
  const ctx = await requireWorkspace();
  const [loans, assets, entities, leases] = await Promise.all([
    listLoans(ctx.workspaceId),
    listAssets(ctx.workspaceId),
    listLegalEntities(ctx.workspaceId),
    listLeases(ctx.workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emprunts & Amortissement</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loans.length} emprunt{loans.length !== 1 ? "s" : ""} · Suivi des financements, tableaux d'amortissement, DSCR
          </p>
        </div>
        {ctx.role !== "read-only" && (
          <CreateLoanButton assets={assets} entities={entities} />
        )}
      </div>
      <LoanListView
        loans={loans}
        assets={assets}
        entities={entities}
        leases={leases}
        role={ctx.role}
      />
    </div>
  );
}
