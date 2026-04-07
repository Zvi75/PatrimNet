import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";

export interface WorkspaceContext {
  userId: string;
  workspaceId: string;
  role: UserRole;
}

/**
 * Returns workspace context from Clerk publicMetadata.
 * Must be called from Server Components or Route Handlers only.
 */
export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  const user = await currentUser();
  if (!user) return null;

  const meta = user.publicMetadata as {
    workspaceId?: string;
    role?: UserRole;
  };

  if (!meta?.workspaceId) return null;

  return {
    userId: user.id,
    workspaceId: meta.workspaceId,
    role: meta.role ?? "read-only",
  };
}

/**
 * Asserts that the current user is authenticated and has a workspace.
 * Redirects to the appropriate page otherwise.
 */
export async function requireWorkspace(): Promise<WorkspaceContext> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/onboarding");

  return ctx;
}

/**
 * Asserts that the current user has at minimum the given role.
 * Role hierarchy: admin > analyst > read-only
 */
export async function requireRole(minimumRole: UserRole): Promise<WorkspaceContext> {
  const ctx = await requireWorkspace();

  const hierarchy: Record<UserRole, number> = {
    admin: 3,
    analyst: 2,
    "read-only": 1,
  };

  if (hierarchy[ctx.role] < hierarchy[minimumRole]) {
    redirect("/dashboard"); // silently redirect instead of showing 403 in Phase 1
  }

  return ctx;
}

/**
 * For use in API Route Handlers: returns context or throws 401/403 responses.
 */
export async function getApiContext(): Promise<WorkspaceContext> {
  const { userId } = await auth();
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const ctx = await getWorkspaceContext();
  if (!ctx) {
    throw new Response("Workspace not found", { status: 403 });
  }

  return ctx;
}

export function assertAdmin(ctx: WorkspaceContext): void {
  if (ctx.role !== "admin") {
    throw new Response("Forbidden — admin only", { status: 403 });
  }
}
