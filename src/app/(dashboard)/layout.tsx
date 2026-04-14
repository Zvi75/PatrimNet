import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getWorkspaceContext } from "@/lib/auth";
import { getWorkspaceById } from "@/lib/notion/workspaces";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { validateEnv } from "@/lib/env";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tag = "[DashboardLayout]";
  console.log(tag, "start — demo:", process.env.NEXT_PUBLIC_DEMO_MODE, "node:", process.version);
  console.log(
    tag,
    "env check — CLERK_SECRET_KEY:",
    !!process.env.CLERK_SECRET_KEY,
    "| PK:",
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    "| APP_URL:",
    !!process.env.NEXT_PUBLIC_APP_URL,
  );

  try {
    validateEnv();
    console.log(tag, "validateEnv OK");
  } catch (e) {
    console.error(tag, "validateEnv FAILED:", e instanceof Error ? e.message : e);
    throw e;
  }

  let userId: string | null;
  try {
    const result = await auth();
    userId = result.userId;
    console.log(tag, "auth() OK — userId present:", !!userId);
  } catch (e) {
    console.error(tag, "auth() FAILED:", e instanceof Error ? e.message : e);
    throw e;
  }

  if (!userId) redirect("/sign-in");

  let ctx;
  try {
    ctx = await getWorkspaceContext();
    console.log(tag, "getWorkspaceContext() OK — ctx:", ctx ? `ws=${ctx.workspaceId}` : "null");
  } catch (e) {
    console.error(tag, "getWorkspaceContext() FAILED:", e instanceof Error ? e.message : e);
    throw e;
  }

  if (!ctx) redirect("/onboarding");

  let workspace;
  try {
    workspace = await getWorkspaceById(ctx.workspaceId);
    console.log(tag, "getWorkspaceById() OK — name:", workspace?.name ?? "null");
  } catch (e) {
    console.error(tag, "getWorkspaceById() FAILED:", e instanceof Error ? e.message : e);
    throw e;
  }

  console.log(tag, "render OK");
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader workspaceName={workspace?.name} role={ctx.role} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
