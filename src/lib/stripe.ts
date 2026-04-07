import Stripe from "stripe";

// Lazy singleton — avoids throwing at build time when env vars are not set
let _instance: Stripe | undefined;

function getStripeInstance(): Stripe {
  if (!_instance) {
    _instance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return _instance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return Reflect.get(getStripeInstance(), prop);
  },
});

// Map plan IDs to Stripe monthly price IDs (set in .env)
export const STRIPE_PRICE_IDS: Record<string, string> = {
  STARTER: process.env.STRIPE_PRICE_STARTER!,
  PRO: process.env.STRIPE_PRICE_PRO!,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE!,
};

// Reverse map: Stripe price ID → PlanId
export function planFromPriceId(priceId: string): string | null {
  for (const [plan, pid] of Object.entries(STRIPE_PRICE_IDS)) {
    if (pid === priceId) return plan;
  }
  return null;
}

export async function getOrCreateStripeCustomer(
  workspaceId: string,
  email: string,
  name: string,
  existingCustomerId?: string,
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { workspaceId },
  });
  return customer.id;
}
