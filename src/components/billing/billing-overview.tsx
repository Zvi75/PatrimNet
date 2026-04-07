"use client";

import { useState } from "react";
import { Check, CreditCard, Loader2, ExternalLink, Zap, Building2, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/constants";
import type { Workspace } from "@/types";

const PLAN_ICONS = {
  STARTER: Zap,
  PRO: Building2,
  ENTERPRISE: Globe,
};

const PLAN_COLORS: Record<string, string> = {
  STARTER: "bg-slate-100 text-slate-700",
  PRO: "bg-blue-100 text-blue-700",
  ENTERPRISE: "bg-violet-100 text-violet-700",
};

interface BillingOverviewProps {
  workspace: Workspace;
  assetCount: number;
  userCount: number;
}

export function BillingOverview({ workspace, assetCount, userCount }: BillingOverviewProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const currentPlanId = (workspace.plan ?? "STARTER").toUpperCase() as keyof typeof PLANS;
  const currentPlan = PLANS[currentPlanId];

  const trialActive =
    workspace.trialEndsAt && new Date(workspace.trialEndsAt) > new Date();

  const trialDaysLeft = workspace.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(workspace.trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;

  async function handleCheckout(plan: string) {
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handlePortal() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoadingPortal(false);
    }
  }

  const maxAssets = currentPlan.maxAssets === Infinity ? "∞" : currentPlan.maxAssets;
  const maxUsers = currentPlan.maxUsers === Infinity ? "∞" : currentPlan.maxUsers;
  const assetPct = currentPlan.maxAssets === Infinity ? 0 : Math.min(100, Math.round((assetCount / currentPlan.maxAssets) * 100));
  const userPct = currentPlan.maxUsers === Infinity ? 0 : Math.min(100, Math.round((userCount / currentPlan.maxUsers) * 100));

  return (
    <div className="space-y-8">
      {/* Current plan status */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Plan actuel</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-xl font-bold text-slate-900">{currentPlan.name}</p>
              <Badge className={PLAN_COLORS[currentPlanId]}>{currentPlanId}</Badge>
            </div>
            {trialActive && (
              <p className="mt-1 text-xs text-amber-600">
                Essai gratuit — {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""} restant{trialDaysLeft > 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Actifs</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {assetCount} <span className="text-sm font-normal text-slate-400">/ {maxAssets}</span>
            </p>
            {currentPlan.maxAssets !== Infinity && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${assetPct >= 90 ? "bg-red-500" : assetPct >= 70 ? "bg-amber-500" : "bg-blue-500"}`}
                  style={{ width: `${assetPct}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Utilisateurs</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {userCount} <span className="text-sm font-normal text-slate-400">/ {maxUsers}</span>
            </p>
            {currentPlan.maxUsers !== Infinity && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${userPct >= 90 ? "bg-red-500" : userPct >= 70 ? "bg-amber-500" : "bg-blue-500"}`}
                  style={{ width: `${userPct}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manage subscription */}
      {workspace.stripeCustomerId && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Gérer votre abonnement</p>
            <p className="text-xs text-slate-500">
              Factures, changement de moyen de paiement, annulation
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handlePortal} disabled={loadingPortal}>
            {loadingPortal ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Portail Stripe
          </Button>
        </div>
      )}

      {/* Plan comparison cards */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-slate-800">Choisir un plan</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.entries(PLANS) as [keyof typeof PLANS, (typeof PLANS)[keyof typeof PLANS]][]).map(
            ([planKey, plan]) => {
              const Icon = PLAN_ICONS[planKey];
              const isCurrent = planKey === currentPlanId;
              const isLoading = loadingPlan === planKey;

              return (
                <Card
                  key={planKey}
                  className={`flex flex-col ${isCurrent ? "ring-2 ring-blue-500" : ""}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="rounded-lg bg-blue-50 p-2">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      {isCurrent && (
                        <Badge className="bg-blue-100 text-blue-700">Plan actuel</Badge>
                      )}
                    </div>
                    <CardTitle className="mt-3 text-lg">{plan.name}</CardTitle>
                    <CardDescription>
                      <span className="text-2xl font-bold text-slate-900">{plan.price}€</span>
                      <span className="text-slate-500"> / mois</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="flex-1 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                          {f}
                        </li>
                      ))}
                      <li className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        {plan.maxAssets === Infinity ? "Actifs illimités" : `Jusqu'à ${plan.maxAssets} actifs`}
                      </li>
                      <li className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        {plan.maxUsers === Infinity ? "Utilisateurs illimités" : `${plan.maxUsers} utilisateur${plan.maxUsers > 1 ? "s" : ""}`}
                      </li>
                    </ul>

                    <Button
                      className="mt-4 w-full"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || isLoading}
                      onClick={() => handleCheckout(planKey)}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Redirection…
                        </>
                      ) : isCurrent ? (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Plan actuel
                        </>
                      ) : (
                        `Passer au plan ${plan.name}`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
