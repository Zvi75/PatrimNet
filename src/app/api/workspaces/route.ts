import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { createWorkspace } from "@/lib/notion/workspaces";
import { createUser } from "@/lib/notion/users";

const schema = z.object({
  name: z.string().min(2).max(80),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name } = schema.parse(body);

    // Create Notion workspace
    const workspace = await createWorkspace({ name, ownerUserId: userId });

    // Get Clerk user for name/email
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const userName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] ||
      "Admin";
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

    // Create Notion user record
    await createUser({
      name: userName,
      email,
      role: "admin",
      workspaceId: workspace.id,
      clerkUserId: userId,
      plan: "starter",
    });

    // Update Clerk user metadata with workspaceId and role
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        workspaceId: workspace.id,
        role: "admin",
      },
    });

    return NextResponse.json({ workspace });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/workspaces]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
