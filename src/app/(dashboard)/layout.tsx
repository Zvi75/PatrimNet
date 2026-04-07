import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getWorkspaceContext } from "@/lib/auth";
import { getWorkspaceById } from "@/lib/notion/workspaces";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { validateEnv } from "@/lib/env";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  validateEnv();

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/onboarding");

  const workspace = await getWorkspaceById(ctx.workspaceId);

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
