import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NotionSetup } from "@/components/setup/notion-setup";
import { Building2 } from "lucide-react";
import { DB_IDS } from "@/lib/notion/client";

export const metadata = { title: "Configuration Notion" };

export default async function SetupPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const isConfigured = Boolean(DB_IDS.USERS && DB_IDS.ASSETS);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Building2 className="h-7 w-7 text-blue-400" />
          <span className="text-xl font-bold text-white">PatrimNet — Configuration</span>
        </div>
        <NotionSetup isConfigured={isConfigured} />
      </div>
    </div>
  );
}
