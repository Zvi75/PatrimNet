import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Building2, BarChart3, FileText, Shield } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-400" />
            <span className="text-xl font-bold text-white">PatrimNet</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              Connexion
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Essai gratuit 14 jours
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          Beta — Accès limité
        </div>

        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white md:text-6xl">
          Gérez votre patrimoine
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            immobilier comme un pro
          </span>
        </h1>

        <p className="mx-auto mb-12 max-w-2xl text-lg text-slate-400">
          PatrimNet centralise vos entités juridiques, actifs, baux, emprunts et flux financiers
          dans une plateforme unique. Génération de rapports PDF/Word/Excel en un clic.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/40"
          >
            Commencer gratuitement
          </Link>
          <Link
            href="/sign-in"
            className="rounded-xl border border-white/20 px-8 py-3.5 text-base font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5"
          >
            Se connecter
          </Link>
        </div>

        {/* Features grid */}
        <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Building2,
              title: "Registre d'actifs",
              description: "SCI, SAS, Holdings — gérez toute votre arborescence juridique",
            },
            {
              icon: FileText,
              title: "Gestion des baux",
              description: "Suivi des échéances, indexation ILC/IRL, alertes automatiques",
            },
            {
              icon: BarChart3,
              title: "Dashboard financier",
              description: "Cash flow, taux d'occupation, rendement net par actif",
            },
            {
              icon: Shield,
              title: "Export triple format",
              description: "Rapports PDF + Word + Excel générés simultanément",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm"
            >
              <feature.icon className="mb-4 h-8 w-8 text-blue-400" />
              <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
