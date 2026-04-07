"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard-error]", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Erreur de chargement</h2>
        <p className="mt-1 text-sm text-slate-500">
          {error.message ?? "Une erreur inattendue s'est produite."}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-slate-400">ID : {error.digest}</p>
        )}
      </div>
      <Button size="sm" onClick={reset}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Réessayer
      </Button>
    </div>
  );
}
