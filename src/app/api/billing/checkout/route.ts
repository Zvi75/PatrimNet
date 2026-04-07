import { NextResponse } from "next/server";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { getApiContext, assertAdmin } from "@/lib/auth";
import { getWorkspaceById, updateWorkspaceStripe } from "@/lib/notion/workspaces";
import { stripe, STRIPE_PRICE_IDS, getOrCreateStripeCustomer } from "@/lib/stripe";

const schema = z.object({
  plan: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
});

export async function POST(req: Request) {
  try {
    const ctx = await getApiContext();
    assertAdmin(ctx);

    const body = await req.json();
    const { plan } = schema.parse(body);

    const priceId = STRIPE_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json({ error: "Price ID non configuré pour ce plan" }, { status: 500 });
    }

    const workspace = await getWorkspaceById(ctx.workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace introuvable" }, { status: 404 });
    }

    // Get Clerk user for name/email
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(ctx.userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email.split("@")[0];

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      ctx.workspaceId,
      email,
      name,
      workspace.stripeCustomerId,
    );

    // Persist customer ID if newly created
    if (!workspace.stripeCustomerId) {
      await updateWorkspaceStripe(ctx.workspaceId, { stripeCustomerId: customerId });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      subscription_data: {
        trial_period_days:
          workspace.plan === "STARTER" || !workspace.stripeSubscriptionId ? 0 : undefined,
        metadata: { workspaceId: ctx.workspaceId, plan },
      },
      metadata: { workspaceId: ctx.workspaceId, plan },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[billing/checkout]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
