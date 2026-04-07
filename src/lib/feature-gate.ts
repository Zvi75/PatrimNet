import { PLANS } from "@/lib/constants";
import type { PlanId } from "@/types";

type Feature = "ai" | "all-reports" | "api-access" | "email-alerts";

const PLAN_FEATURES: Record<PlanId, Feature[]> = {
  STARTER: ["email-alerts"],
  PRO: ["ai", "all-reports", "email-alerts"],
  ENTERPRISE: ["ai", "all-reports", "api-access", "email-alerts"],
};

export function canUseFeature(plan: PlanId, feature: Feature): boolean {
  return PLAN_FEATURES[plan]?.includes(feature) ?? false;
}

export function getMaxAssets(plan: PlanId): number {
  return PLANS[plan].maxAssets;
}

export function getMaxUsers(plan: PlanId): number {
  return PLANS[plan].maxUsers;
}

export function getPlanName(plan: PlanId): string {
  return PLANS[plan].name;
}

/**
 * Throws a Response(403) if plan does not include the feature.
 * Use in API route handlers.
 */
export function requireFeature(plan: PlanId, feature: Feature): void {
  if (!canUseFeature(plan, feature)) {
    throw new Response(
      JSON.stringify({
        error: `Cette fonctionnalité n'est pas disponible sur le plan ${getPlanName(plan)}. Passez au plan supérieur.`,
        upgradeRequired: true,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
}
