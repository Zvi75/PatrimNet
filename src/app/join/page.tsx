import { Suspense } from "react";
import { Building2 } from "lucide-react";
import { JoinWorkspace } from "@/components/join/join-workspace";

export const metadata = { title: "Rejoindre un workspace" };

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">PatrimNet</span>
          </div>
        </div>
        <Suspense fallback={null}>
          <JoinWorkspace token={token} />
        </Suspense>
      </div>
    </div>
  );
}
