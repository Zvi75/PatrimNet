import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext, assertAdmin } from "@/lib/auth";
import { updateUserRole, removeUserFromWorkspace, getWorkspaceMembers } from "@/lib/notion/users";
import { clerkClient } from "@clerk/nextjs/server";
import type { UserRole } from "@/types";

const patchSchema = z.object({ role: z.enum(["analyst", "read-only"]) });

export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } },
) {
  try {
    const ctx = await getApiContext();
    assertAdmin(ctx);

    const body = await req.json();
    const { role } = patchSchema.parse(body);

    // Find member's Notion record
    const members = await getWorkspaceMembers(ctx.workspaceId);
    const member = members.find((m) => m.clerkUserId === params.userId);
    if (!member?.notionId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Cannot change own role
    if (params.userId === ctx.userId) {
      return NextResponse.json({ error: "Impossible de modifier son propre rôle" }, { status: 400 });
    }

    await updateUserRole(member.notionId, role as UserRole);

    // Update Clerk metadata too
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(params.userId).catch(() => null);
    if (clerkUser) {
      await clerk.users.updateUserMetadata(params.userId, {
        publicMetadata: { workspaceId: ctx.workspaceId, role },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 });
    console.error("[PATCH /api/workspaces/members]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { userId: string } },
) {
  try {
    const ctx = await getApiContext();
    assertAdmin(ctx);

    if (params.userId === ctx.userId) {
      return NextResponse.json({ error: "Impossible de se retirer soi-même" }, { status: 400 });
    }

    const members = await getWorkspaceMembers(ctx.workspaceId);
    const member = members.find((m) => m.clerkUserId === params.userId);
    if (!member?.notionId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Archive in Notion
    await removeUserFromWorkspace(member.notionId);

    // Clear Clerk metadata
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(params.userId).catch(() => null);
    if (clerkUser) {
      await clerk.users.updateUserMetadata(params.userId, {
        publicMetadata: {},
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[DELETE /api/workspaces/members]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
