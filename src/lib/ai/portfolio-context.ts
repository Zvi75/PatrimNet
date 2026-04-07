import { listAssets } from "@/lib/notion/assets";
import { listLeases } from "@/lib/notion/leases";
import { listTenants } from "@/lib/notion/tenants";
import { listLoans } from "@/lib/notion/loans";
import { listLegalEntities } from "@/lib/notion/legal-entities";
import { listTransactions } from "@/lib/notion/transactions";
import { generateAmortizationSchedule, estimateOutstandingCapital } from "@/lib/amortization";
import { formatCurrency } from "@/lib/utils";

export async function buildPortfolioContext(workspaceId: string): Promise<string> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [assets, leases, tenants, loans, entities, recentTx] = await Promise.all([
    listAssets(workspaceId),
    listLeases(workspaceId),
    listTenants(workspaceId),
    listLoans(workspaceId),
    listLegalEntities(workspaceId),
    listTransactions(workspaceId, { dateFrom: threeMonthsAgo.toISOString().slice(0, 10) }),
  ]);

  const entityMap = new Map(entities.map((e) => [e.id, e.name]));
  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  // KPI summary
  const activeLeases = leases.filter((l) => l.status === "Actif");
  const monthlyRentRoll = activeLeases.reduce((s, l) => s + l.baseRent + (l.charges ?? 0), 0);
  const totalMarketValue = assets.reduce((s, a) => s + (a.currentMarketValue ?? 0), 0);
  const occupiedAssets = assets.filter((a) => a.status === "Occupé").length;
  const leaseOccupancyRate =
    leases.length > 0 ? ((activeLeases.length / leases.length) * 100).toFixed(1) : "N/A";
  const netYield =
    totalMarketValue > 0 && monthlyRentRoll > 0
      ? (((monthlyRentRoll * 12) / totalMarketValue) * 100).toFixed(2)
      : "N/A";

  // Loans summary
  const loanSummaries = loans.map((loan) => {
    const outstanding =
      loan.outstandingCapital ??
      estimateOutstandingCapital(
        generateAmortizationSchedule({
          loanId: loan.id,
          initialAmount: loan.initialAmount,
          annualInterestRate: loan.interestRate,
          monthlyPayment: loan.monthlyPayment,
          startDate: loan.startDate,
          endDate: loan.endDate,
        }),
      );
    const assetLeases = activeLeases.filter((l) => l.assetId === loan.assetId);
    const annualRent = assetLeases.reduce((s, l) => s + (l.baseRent + (l.charges ?? 0)) * 12, 0);
    const dscr = loan.monthlyPayment > 0 ? annualRent / (loan.monthlyPayment * 12) : null;
    return { ...loan, outstanding, dscr };
  });

  const totalOutstandingDebt = loanSummaries.reduce((s, l) => s + l.outstanding, 0);
  const ltv =
    totalMarketValue > 0 ? ((totalOutstandingDebt / totalMarketValue) * 100).toFixed(1) : "N/A";

  // Transaction summary (last 3 months)
  const txIn = recentTx
    .filter((t) => t.direction === "Encaissement")
    .reduce((s, t) => s + t.amount, 0);
  const txOut = recentTx
    .filter((t) => t.direction === "Décaissement")
    .reduce((s, t) => s + t.amount, 0);

  // Expiring leases (next 90 days)
  const today = new Date().toISOString().slice(0, 10);
  const in90 = new Date();
  in90.setDate(in90.getDate() + 90);
  const expiringLeases = activeLeases.filter(
    (l) => l.endDate >= today && l.endDate <= in90.toISOString().slice(0, 10),
  );

  const lines: string[] = [
    `# Contexte du portefeuille immobilier — ${new Date().toLocaleDateString("fr-FR")}`,
    "",
    "## KPIs globaux",
    `- Nombre d'actifs : ${assets.length} (${occupiedAssets} occupés)`,
    `- Loyer brut mensuel : ${formatCurrency(monthlyRentRoll)} (${activeLeases.length} baux actifs)`,
    `- Taux d'occupation baux : ${leaseOccupancyRate}%`,
    `- Valeur de marché totale : ${totalMarketValue > 0 ? formatCurrency(totalMarketValue) : "non renseignée"}`,
    `- Rendement net estimé : ${netYield}%`,
    `- Dette totale (capital restant) : ${formatCurrency(totalOutstandingDebt)}`,
    `- LTV : ${ltv}%`,
    `- Cash flow 3 mois : +${formatCurrency(txIn)} encaissements / -${formatCurrency(txOut)} décaissements (net : ${formatCurrency(txIn - txOut)})`,
    "",
    "## Actifs",
  ];

  for (const asset of assets) {
    const entity = entityMap.get(asset.legalEntityId) ?? "—";
    const assetLeases = activeLeases.filter((l) => l.assetId === asset.id);
    const assetRent = assetLeases.reduce((s, l) => s + l.baseRent + (l.charges ?? 0), 0);
    lines.push(
      `- ${asset.name} [${asset.type}, ${asset.status}] — Entité: ${entity}` +
        (asset.surfaceM2 ? `, ${asset.surfaceM2}m²` : "") +
        (asset.currentMarketValue ? `, valeur: ${formatCurrency(asset.currentMarketValue)}` : "") +
        (asset.ownershipPercent && asset.ownershipPercent < 100
          ? `, détention: ${asset.ownershipPercent}%`
          : "") +
        (assetRent > 0 ? `, loyer: ${formatCurrency(assetRent)}/mois` : "") +
        (asset.dpe ? `, DPE: ${asset.dpe}` : ""),
    );
  }

  lines.push("", "## Baux actifs");
  for (const lease of activeLeases) {
    const assetName = assets.find((a) => a.id === lease.assetId)?.name ?? "—";
    const tenantName = tenantMap.get(lease.tenantId) ?? "—";
    lines.push(
      `- ${lease.reference} — ${assetName} / ${tenantName} [${lease.type}] : ${formatCurrency(lease.baseRent)}/mois` +
        (lease.charges ? ` + ${formatCurrency(lease.charges)} charges` : "") +
        `, fin: ${lease.endDate}` +
        (lease.indexationIndex && lease.indexationIndex !== "None"
          ? `, indexation: ${lease.indexationIndex}`
          : ""),
    );
  }

  if (expiringLeases.length > 0) {
    lines.push("", "## Baux arrivant à échéance dans 90 jours");
    for (const l of expiringLeases) {
      const assetName = assets.find((a) => a.id === l.assetId)?.name ?? "—";
      const days = Math.ceil((new Date(l.endDate).getTime() - Date.now()) / 86400000);
      lines.push(`- ${l.reference} (${assetName}) — expire le ${l.endDate} (J-${days})`);
    }
  }

  lines.push("", "## Emprunts");
  for (const loan of loanSummaries) {
    const assetName = assets.find((a) => a.id === loan.assetId)?.name ?? "—";
    lines.push(
      `- ${loan.reference} — ${loan.bank}, actif: ${assetName}` +
        `, capital initial: ${formatCurrency(loan.initialAmount)}` +
        `, taux: ${loan.interestRate}%` +
        `, mensualité: ${formatCurrency(loan.monthlyPayment)}` +
        `, restant: ${formatCurrency(loan.outstanding)}` +
        `, fin: ${loan.endDate}` +
        (loan.dscr !== null ? `, DSCR: ${loan.dscr.toFixed(2)}` : ""),
    );
  }

  lines.push("", "## Entités juridiques");
  for (const entity of entities) {
    const assetCount = assets.filter((a) => a.legalEntityId === entity.id).length;
    lines.push(
      `- ${entity.name} [${entity.type}]` +
        (entity.taxRegime ? `, régime: ${entity.taxRegime}` : "") +
        ` — ${assetCount} actif${assetCount !== 1 ? "s" : ""}`,
    );
  }

  return lines.join("\n");
}

export const SYSTEM_PROMPT = `Tu es PatrimNet AI, un assistant expert en gestion patrimoniale immobilière.
Tu analyses le portefeuille immobilier de l'utilisateur et réponds à ses questions en français.
Tu es précis, concis et factuel. Tu bases tes réponses uniquement sur les données fournies dans le contexte.
Si une information est manquante ou incalculable, dis-le clairement.
Tu peux faire des calculs, des comparaisons, identifier des alertes ou des opportunités.
Format: utilise des listes à puces et du gras pour structurer les réponses importantes. Sois direct.`;
