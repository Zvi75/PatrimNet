import { TrendingUp, Home, FileText, Building2, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface DashboardKPIsProps {
  totalAssets: number;
  monthlyRentRoll: number;
  occupancyRate: number;
  totalMarketValue: number;
  netYield: number | null;
  activeLeases: number;
  totalOutstandingDebt: number;
}

export function DashboardKPIs({
  totalAssets,
  monthlyRentRoll,
  occupancyRate,
  totalMarketValue,
  netYield,
  activeLeases,
  totalOutstandingDebt,
}: DashboardKPIsProps) {
  const cards = [
    {
      label: "Actifs",
      value: totalAssets.toString(),
      sub: "dans le portefeuille",
      icon: Home,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Loyer brut mensuel",
      value: formatCurrency(monthlyRentRoll),
      sub: `${formatCurrency(monthlyRentRoll * 12)} / an · ${activeLeases} bail${activeLeases !== 1 ? "x" : ""} actif${activeLeases !== 1 ? "s" : ""}`,
      icon: FileText,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Taux d'occupation",
      value: formatPercent(occupancyRate),
      sub: "sur l'ensemble des baux",
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Valeur de marché",
      value: totalMarketValue > 0 ? formatCurrency(totalMarketValue) : "—",
      sub: netYield !== null ? `Rendement net : ${netYield.toFixed(2)}%` : "rendement non calculable",
      icon: Building2,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Dette totale",
      value: totalOutstandingDebt > 0 ? formatCurrency(totalOutstandingDebt) : "—",
      sub: totalMarketValue > 0 && totalOutstandingDebt > 0
        ? `LTV : ${((totalOutstandingDebt / totalMarketValue) * 100).toFixed(1)}%`
        : "aucun emprunt",
      icon: Landmark,
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-0.5 text-xs text-slate-400">{card.sub}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
