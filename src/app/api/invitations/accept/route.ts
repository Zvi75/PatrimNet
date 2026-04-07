import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { acceptInvitation } from "@/lib/notion/invitations";
import { getWorkspaceContext } from "@/lib/auth";

const schema = z.object({ token: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Already in a workspace
    const existing = await getWorkspaceContext();
    if (existing) {
      return NextResponse.json({ error: "Vous êtes déjà membre d'un workspace" }, { status: 409 });
    }

    const body = await req.json();
    const { token } = schema.parse(body);

    // Get user's name from Clerk
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] ||
      "Utilisateur";

    // Accept invite in Notion
    const invitation = await acceptInvitation(token, userId, name);
    if (!invitation) {
      return NextResponse.json({ error: "Invitation introuvable ou expirée" }, { status: 404 });
    }

    // Update Clerk metadata
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        workspaceId: invitation.workspaceId,
        role: invitation.role,
      },
    });

    return NextResponse.json({ ok: true, workspaceId: invitation.workspaceId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/invitations/accept]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
