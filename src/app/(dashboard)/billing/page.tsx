import { requireWorkspace } from "@/lib/auth";
import { getWorkspaceById } from "@/lib/notion/workspaces";
import { listAssets } from "@/lib/notion/assets";
import { getWorkspaceMembers } from "@/lib/notion/users";
import { BillingOverview } from "@/components/billing/billing-overview";
import { BillingToast } from "@/components/billing/billing-toast";

export const metadata = { title: "Abonnement" };

interface BillingPageProps {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const ctx = await requireWorkspace();
  const params = await searchParams;

  const [workspace, assets, members] = await Promise.all([
    getWorkspaceById(ctx.workspaceId),
    listAssets(ctx.workspaceId),
    getWorkspaceMembers(ctx.workspaceId),
  ]);

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Abonnement & Facturation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gérez votre plan, votre facturation et vos limites d'usage
        </p>
      </div>

      {params.success && <BillingToast type="success" />}
      {params.canceled && <BillingToast type="canceled" />}

      <BillingOverview
        workspace={workspace}
        assetCount={assets.length}
        userCount={members.length}
      />
    </div>
  );
}
