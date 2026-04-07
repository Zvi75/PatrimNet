import { NextResponse } from "next/server";
import { getApiContext, assertAdmin } from "@/lib/auth";
import { getWorkspaceById } from "@/lib/notion/workspaces";
import { stripe } from "@/lib/stripe";

export async function POST() {
  try {
    const ctx = await getApiContext();
    assertAdmin(ctx);

    const workspace = await getWorkspaceById(ctx.workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace introuvable" }, { status: 404 });
    }
    if (!workspace.stripeCustomerId) {
      return NextResponse.json({ error: "Aucun abonnement actif trouvé" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[billing/portal]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
