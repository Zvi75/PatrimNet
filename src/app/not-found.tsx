import Link from "next/link";
import { Building2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <Building2 className="mb-4 h-10 w-10 text-blue-600" />
      <h1 className="text-3xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-slate-500">Cette page n'existe pas.</p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
