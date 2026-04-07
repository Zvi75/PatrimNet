"use client";

import { useState } from "react";
import { BarChart3, Building2, ArrowLeftRight, PiggyBank, Landmark, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "./export-dialog";
import type { Asset, Lease, Loan } from "@/types";

type ReportId =
  | "fiche-actif"
  | "rapport-portefeuille"
  | "flux-mensuel"
  | "synthese-fiscale"
  | "plan-financement"
  | "rapport-locataire";

const REPORTS: { id: ReportId; title: string; description: string; icon: React.ElementType }[] = [
  {
    id: "rapport-portefeuille",
    title: "Rapport de portefeuille",
    description: "Vue consolidée de tous les actifs et entités du workspace",
    icon: BarChart3,
  },
  {
    id: "fiche-actif",
    title: "Fiche actif",
    description: "Synthèse complète d'un actif : identité, bail, financiers, emprunts",
    icon: Building2,
  },
  {
    id: "flux-mensuel",
    title: "Tableau de flux mensuel",
    description: "Toutes les transactions pour une période, par actif",
    icon: ArrowLeftRight,
  },
  {
    id: "synthese-fiscale",
    title: "Synthèse fiscale",
    description: "Revenus bruts, charges déductibles, revenu net imposable",
    icon: PiggyBank,
  },
  {
    id: "plan-financement",
    title: "Plan de financement",
    description: "Tableau d'amortissement complet avec capital restant et coût des intérêts",
    icon: Landmark,
  },
  {
    id: "rapport-locataire",
    title: "Rapport locataire",
    description: "Synthèse du bail avec historique de paiement et score",
    icon: Users,
  },
];

interface ReportsListProps {
  assets?: Asset[];
  leases?: Lease[];
  loans?: Loan[];
}

export function ReportsList({ assets = [], leases = [], loans = [] }: ReportsListProps) {
  const [activeReport, setActiveReport] = useState<ReportId | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <Card key={report.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2.5">
                  <report.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-sm">{report.title}</CardTitle>
                  <CardDescription className="mt-1 text-xs">{report.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setActiveReport(report.id)}
              >
                Exporter (PDF + Word + Excel)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeReport && (
        <ExportDialog
          reportType={activeReport}
          reportTitle={REPORTS.find((r) => r.id === activeReport)!.title}
          open={!!activeReport}
          onOpenChange={(open) => { if (!open) setActiveReport(null); }}
          assets={assets}
          leases={leases}
          loans={loans}
        />
      )}
    </>
  );
}
