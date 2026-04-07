import { requireWorkspace } from "@/lib/auth";
import { listTenants } from "@/lib/notion/tenants";
import { TenantListView } from "@/components/tenants/tenant-list-view";
import { CreateTenantButton } from "@/components/tenants/create-tenant-button";

export const metadata = { title: "Locataires" };

export default async function TenantsPage() {
  const ctx = await requireWorkspace();
  const tenants = await listTenants(ctx.workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Locataires</h1>
          <p className="mt-1 text-sm text-slate-500">
            {tenants.length} locataire{tenants.length !== 1 ? "s" : ""}
          </p>
        </div>
        {ctx.role !== "read-only" && <CreateTenantButton />}
      </div>
      <TenantListView tenants={tenants} role={ctx.role} />
    </div>
  );
}
