import { requireWorkspace } from "@/lib/auth";
import { listLegalEntities, buildEntityTree } from "@/lib/notion/legal-entities";
import { EntityTreeView } from "@/components/entities/entity-tree-view";
import { CreateEntityButton } from "@/components/entities/create-entity-button";

export const metadata = { title: "Entités juridiques" };

export default async function EntitiesPage() {
  const ctx = await requireWorkspace();
  const flat = await listLegalEntities(ctx.workspaceId);
  const tree = buildEntityTree(flat);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Entités juridiques</h1>
          <p className="mt-1 text-sm text-slate-500">
            {flat.length} entité{flat.length !== 1 ? "s" : ""} · Arborescence Holdings → Filiales
          </p>
        </div>
        {ctx.role !== "read-only" && (
          <CreateEntityButton entities={flat} />
        )}
      </div>
      <EntityTreeView tree={tree} flat={flat} role={ctx.role} />
    </div>
  );
}
