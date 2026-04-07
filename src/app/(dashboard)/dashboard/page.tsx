import { requireWorkspace } from "@/lib/auth";
import { listAssets } from "@/lib/notion/assets";
import { listLeases } from "@/lib/notion/leases";
import { listTenants } from "@/lib/notion/tenants";
import { listLoans } from "@/lib/notion/loans";
import { listTransactions, getMonthlyCashFlow } from "@/lib/notion/transactions";
import { generateAmortizationSchedule, estimateOutstandingCapital } from "@/lib/amortization";
import { DashboardKPIs } from "@/components/dashboard/dashboard-kpis";
import { CashFlowChart } from "@/components/dashboard/cashflow-chart";
import { OccupancyChart } from "@/components/dashboard/occupancy-chart";
import { LeaseAlerts } from "@/components/dashboard/lease-alerts";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { ASSET_STATUSES } from "@/lib/constants";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const ctx = await requireWorkspace();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [assets, leases, tenants, loans, cashFlowData, recentTx] = await Promise.all([
    listAssets(ctx.workspaceId),
    listLeases(ctx.workspaceId),
    listTenants(ctx.workspaceId),
    listLoans(ctx.workspaceId),
    getMonthlyCashFlow(ctx.workspaceId, 6),
    listTransactions(ctx.workspaceId, {
      dateFrom: sixMonthsAgo.toISOString().slice(0, 10),
    }),
  ]);

  // Total outstanding debt from loans
  const totalOutstandingDebt = loans.reduce((s, loan) => {
    const outstanding = loan.outstandingCapital ?? estimateOutstandingCapital(
      generateAmortizationSchedule({
        loanId: loan.id,
        initialAmount: loan.initialAmount,
        annualInterestRate: loan.interestRate,
        monthlyPayment: loan.monthlyPayment,
        startDate: loan.startDate,
        endDate: loan.endDate,
      }),
    );
    return s + outstanding;
  }, 0);

  // KPI computations
  const activeLeases = leases.filter((l) => l.status === "Actif");
  const monthlyRentRoll = activeLeases.reduce((s, l) => s + l.baseRent + (l.charges ?? 0), 0);
  const totalMarketValue = assets.reduce((s, a) => s + (a.currentMarketValue ?? 0), 0);
  const occupancyRate = leases.length > 0 ? (activeLeases.length / leases.length) * 100 : 0;
  const netYield = totalMarketValue > 0 && monthlyRentRoll > 0
    ? (monthlyRentRoll * 12 / totalMarketValue) * 100
    : null;

  // Occupancy breakdown by asset status
  const occupancyData = ASSET_STATUSES.map((status) => ({
    status,
    count: assets.filter((a) => a.status === status).length,
  })).filter((d) => d.count > 0);

  // Asset-based occupancy rate
  const occupiedAssets = assets.filter((a) => a.status === "Occupé").length;
  const assetOccupancyRate = assets.length > 0 ? (occupiedAssets / assets.length) * 100 : 0;

  // Maps for lease alerts
  const assetMap = new Map(assets.map((a) => [a.id, a.name]));
  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-500">Vue consolidée de votre patrimoine immobilier</p>
      </div>

      <DashboardKPIs
        totalAssets={assets.length}
        monthlyRentRoll={monthlyRentRoll}
        occupancyRate={occupancyRate}
        totalMarketValue={totalMarketValue}
        netYield={netYield}
        activeLeases={activeLeases.length}
        totalOutstandingDebt={totalOutstandingDebt}
      />

      <LeaseAlerts leases={leases} assetMap={assetMap} tenantMap={tenantMap} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CashFlowChart data={cashFlowData} />
        <OccupancyChart data={occupancyData} occupancyRate={assetOccupancyRate} />
      </div>

      <RecentTransactions transactions={recentTx} />
    </div>
  );
}
