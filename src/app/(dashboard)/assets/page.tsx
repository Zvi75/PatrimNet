import { requireWorkspace } from "@/lib/auth";
import { listAssets, countAssets } from "@/lib/notion/assets";
import { listLegalEntities } from "@/lib/notion/legal-entities";
import { getWorkspaceById } from "@/lib/notion/workspaces";
import { getMaxAssets } from "@/lib/feature-gate";
import { AssetListView } from "@/components/assets/asset-list-view";
import { CreateAssetButton } from "@/components/assets/create-asset-button";

export const metadata = { title: "Actifs immobiliers" };

export default async function AssetsPage() {
  const ctx = await requireWorkspace();
  const [assets, entities, workspace] = await Promise.all([
    listAssets(ctx.workspaceId),
    listLegalEntities(ctx.workspaceId),
    getWorkspaceById(ctx.workspaceId),
  ]);

  const maxAssets = getMaxAssets(
    (workspace?.plan.toUpperCase() ?? "STARTER") as "STARTER" | "PRO" | "ENTERPRISE",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Actifs immobiliers</h1>
          <p className="mt-1 text-sm text-slate-500">
            {assets.length} / {maxAssets === Infinity ? "∞" : maxAssets} actif
            {assets.length !== 1 ? "s" : ""}
          </p>
        </div>
        {ctx.role !== "read-only" && <CreateAssetButton entities={entities} />}
      </div>
      <AssetListView assets={assets} entities={entities} role={ctx.role} />
    </div>
  );
}
