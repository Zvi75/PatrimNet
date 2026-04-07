import { requireWorkspace } from "@/lib/auth";
import { listLeases } from "@/lib/notion/leases";
import { listAssets } from "@/lib/notion/assets";
import { listTenants } from "@/lib/notion/tenants";
import { LeaseListView } from "@/components/leases/lease-list-view";
import { CreateLeaseButton } from "@/components/leases/create-lease-button";

export const metadata = { title: "Baux" };

export default async function LeasesPage() {
  const ctx = await requireWorkspace();
  const [leases, assets, tenants] = await Promise.all([
    listLeases(ctx.workspaceId),
    listAssets(ctx.workspaceId),
    listTenants(ctx.workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des baux</h1>
          <p className="mt-1 text-sm text-slate-500">
            {leases.length} bail{leases.length !== 1 ? "x" : ""} ·{" "}
            {leases.filter((l) => l.status === "Actif").length} actif
            {leases.filter((l) => l.status === "Actif").length !== 1 ? "s" : ""}
          </p>
        </div>
        {ctx.role !== "read-only" && <CreateLeaseButton assets={assets} tenants={tenants} />}
      </div>
      <LeaseListView leases={leases} assets={assets} tenants={tenants} role={ctx.role} />
    </div>
  );
}
