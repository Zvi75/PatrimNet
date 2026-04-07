"use client";

import { useEffect } from "react";
import { Building2, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
          <Building2 className="mb-4 h-10 w-10 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">Une erreur est survenue</h1>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            {error.message ?? "Erreur inattendue. Veuillez réessayer ou contacter le support."}
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-xs text-slate-400">ID : {error.digest}</p>
          )}
          <button
            onClick={reset}
            className="mt-6 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
