import { NextResponse } from "next/server";
import { getInvitationByToken } from "@/lib/notion/invitations";
import { getWorkspaceById } from "@/lib/notion/workspaces";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const invitation = await getInvitationByToken(token);
    if (!invitation) {
      return NextResponse.json({ error: "Invitation introuvable ou expirée" }, { status: 404 });
    }

    const workspace = await getWorkspaceById(invitation.workspaceId);

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        workspaceId: invitation.workspaceId,
        workspaceName: workspace?.name ?? "Workspace",
      },
    });
  } catch (err) {
    console.error("[GET /api/invitations/[token]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
