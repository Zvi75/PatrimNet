import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext, assertAdmin } from "@/lib/auth";
import { getWorkspaceById } from "@/lib/notion/workspaces";
import { getUserByEmail, getWorkspaceMembers } from "@/lib/notion/users";
import { createInvitation } from "@/lib/notion/invitations";
import { sendInvitationEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";
import { PLANS } from "@/lib/constants";
import type { UserRole } from "@/types";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["analyst", "read-only"]),
});

export async function POST(req: Request) {
  try {
    const ctx = await getApiContext();
    assertAdmin(ctx);

    const body = await req.json();
    const { email, role } = schema.parse(body);

    // Check plan limits
    const members = await getWorkspaceMembers(ctx.workspaceId);
    const workspace = await getWorkspaceById(ctx.workspaceId);
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const plan = PLANS[workspace.plan.toUpperCase() as keyof typeof PLANS];
    if (members.length >= plan.maxUsers) {
      return NextResponse.json(
        { error: `Limite atteinte pour le plan ${plan.name} (${plan.maxUsers} utilisateurs max)` },
        { status: 403 },
      );
    }

    // Check if already a member
    const existing = await getUserByEmail(email);
    if (existing && existing.workspaceId === ctx.workspaceId) {
      return NextResponse.json(
        { error: "Cet utilisateur est déjà membre du workspace" },
        { status: 409 },
      );
    }

    // Get inviter name
    const clerk = await clerkClient();
    const inviter = await clerk.users.getUser(ctx.userId);
    const inviterName = [inviter.firstName, inviter.lastName].filter(Boolean).join(" ") || email;

    // Create invitation record in Notion
    const invitation = await createInvitation({
      email,
      workspaceId: ctx.workspaceId,
      role: role as UserRole,
      invitedBy: ctx.userId,
      workspaceName: workspace.name,
    });

    // Send invitation email
    await sendInvitationEmail({
      to: email,
      inviterName,
      workspaceName: workspace.name,
      role,
      token: invitation.token,
    });

    return NextResponse.json({ ok: true, message: `Invitation envoyée à ${email}` });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    console.error("[POST /api/workspaces/invite]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
