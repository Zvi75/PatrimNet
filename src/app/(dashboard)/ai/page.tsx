import { requireWorkspace } from "@/lib/auth";
import { getWorkspaceById } from "@/lib/notion/workspaces";
import { listLoans } from "@/lib/notion/loans";
import { listAssets } from "@/lib/notion/assets";
import { canUseFeature } from "@/lib/feature-gate";
import { AIQueryInterface } from "@/components/ai/ai-query-interface";
import { AmortizationParser } from "@/components/ai/amortization-parser";
import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = { title: "Assistant IA" };

export default async function AIPage() {
  const ctx = await requireWorkspace();
  const [workspace, loans, assets] = await Promise.all([
    getWorkspaceById(ctx.workspaceId),
    listLoans(ctx.workspaceId),
    listAssets(ctx.workspaceId),
  ]);

  const plan = (workspace?.plan.toUpperCase() ?? "STARTER") as "STARTER" | "PRO" | "ENTERPRISE";
  const hasAI = canUseFeature(plan, "ai");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assistant IA</h1>
          <p className="mt-1 text-sm text-slate-500">
            Requêtes en langage naturel et parsing de documents
          </p>
        </div>
        {!hasAI && (
          <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            <Lock className="h-3.5 w-3.5" />
            Plan Pro requis
          </div>
        )}
      </div>

      {!hasAI && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-amber-400" />
          <p className="text-lg font-semibold text-amber-800">Fonctionnalité IA — Plan Pro</p>
          <p className="mt-2 text-sm text-amber-600 max-w-md mx-auto">
            L'assistant IA et le parsing automatique de tableaux d'amortissement sont disponibles
            à partir du plan Pro (149€/mois).
          </p>
          <div className="mt-4 space-y-1 text-sm text-amber-700">
            <p>✦ Requêtes en langage naturel sur votre portefeuille</p>
            <p>✦ Parsing IA de tableaux d'amortissement PDF</p>
            <p>✦ Alertes et recommandations intelligentes</p>
          </div>
          <Link href="/billing">
            <Button className="mt-6 bg-amber-600 hover:bg-amber-700">
              Passer au plan Pro →
            </Button>
          </Link>
        </div>
      )}

      {hasAI && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AIQueryInterface />
          </div>
          <div>
            <AmortizationParser loans={loans} assets={assets} />
          </div>
        </div>
      )}
    </div>
  );
}
