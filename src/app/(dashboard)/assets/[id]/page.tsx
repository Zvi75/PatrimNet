import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/auth";
import { getAssetById } from "@/lib/notion/assets";
import { listLeasesByAsset } from "@/lib/notion/leases";
import { listLoansByAsset } from "@/lib/notion/loans";
import { listDocumentsByAsset } from "@/lib/notion/documents";
import { getLegalEntityById } from "@/lib/notion/legal-entities";
import { AssetDetailView } from "@/components/assets/asset-detail-view";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await getAssetById(id);
  return { title: asset?.name ?? "Fiche actif" };
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireWorkspace();

  const asset = await getAssetById(id);
  if (!asset || asset.workspaceId !== ctx.workspaceId) notFound();

  const [leases, loans, documents, entity] = await Promise.all([
    listLeasesByAsset(id),
    listLoansByAsset(id),
    listDocumentsByAsset(id),
    asset.legalEntityId ? getLegalEntityById(asset.legalEntityId) : null,
  ]);

  return (
    <AssetDetailView
      asset={asset}
      entity={entity}
      leases={leases}
      loans={loans}
      documents={documents}
      role={ctx.role}
    />
  );
}
