import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/auth";
import { getWorkspaceById, updateWorkspaceName } from "@/lib/notion/workspaces";
import { getWorkspaceMembers } from "@/lib/notion/users";
import { z } from "zod";

export async function GET() {
  try {
    const ctx = await getApiContext();
    const [workspace, members] = await Promise.all([
      getWorkspaceById(ctx.workspaceId),
      getWorkspaceMembers(ctx.workspaceId),
    ]);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json({ workspace, members, currentUserId: ctx.userId, currentRole: ctx.role });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[GET /api/workspaces/current]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const patchSchema = z.object({ name: z.string().min(2).max(80) });

export async function PATCH(req: Request) {
  try {
    const ctx = await getApiContext();
    if (ctx.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name } = patchSchema.parse(body);

    await updateWorkspaceName(ctx.workspaceId, name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 });
    console.error("[PATCH /api/workspaces/current]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
