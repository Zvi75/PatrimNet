import type {
  PortfolioReportData,
  AssetReportData,
  CashFlowReportData,
  FiscalReportData,
  LoanPlanData,
  TenantReportData,
} from "./data";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { generateAmortizationSchedule, estimateOutstandingCapital } from "@/lib/amortization";

const CSS = `
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 32px; }
  h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  h2 { font-size: 14px; font-weight: 600; color: #334155; margin: 20px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .meta { font-size: 10px; color: #94a3b8; margin-bottom: 24px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .kpi-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi-value { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
  th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:hover td { background: #f8fafc; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-yellow { background: #fef9c3; color: #854d0e; }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .badge-gray { background: #f1f5f9; color: #475569; }
  .footer { margin-top: 32px; font-size: 9px; color: #cbd5e1; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 12px; }
  .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 10px; color: #991b1b; }
  .positive { color: #16a34a; font-weight: 600; }
  .negative { color: #dc2626; font-weight: 600; }
  .current-row { background: #eff6ff !important; font-weight: 600; }
`;

function htmlDoc(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>${body}<div class="footer">PatrimNet · Généré le ${new Date().toLocaleDateString("fr-FR")} · Document confidentiel</div></body></html>`;
}

function statusBadge(status: string): string {
  const cls =
    status === "Occupé" || status === "Actif"
      ? "badge-green"
      : status === "Vacant" || status === "Résilié" || status === "Expiré"
        ? "badge-red"
        : status === "En travaux" || status === "En cours de renouvellement"
          ? "badge-yellow"
          : "badge-gray";
  return `<span class="badge ${cls}">${status}</span>`;
}

export function buildPortfolioHTML(d: PortfolioReportData): string {
  const activeLeases = d.leases.filter((l) => l.status === "Actif");
  const monthlyRent = activeLeases.reduce((s, l) => s + l.baseRent + (l.charges ?? 0), 0);
  const totalValue = d.assets.reduce((s, a) => s + (a.currentMarketValue ?? 0), 0);
  const totalDebt = d.loans.reduce((s, loan) => {
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
    return s + outstanding;
  }, 0);
  const occupancy =
    d.leases.length > 0 ? ((activeLeases.length / d.leases.length) * 100).toFixed(1) : "—";
  const netYield = totalValue > 0 ? (((monthlyRent * 12) / totalValue) * 100).toFixed(2) : "—";

  const assetsRows = d.assets
    .map(
      (a) => `
    <tr>
      <td><strong>${a.name}</strong></td>
      <td>${a.type}</td>
      <td>${statusBadge(a.status)}</td>
      <td>${d.entityMap.get(a.legalEntityId) ?? "—"}</td>
      <td>${a.surfaceM2 ? `${a.surfaceM2} m²` : "—"}</td>
      <td>${a.acquisitionPrice ? formatCurrency(a.acquisitionPrice) : "—"}</td>
      <td>${a.currentMarketValue ? formatCurrency(a.currentMarketValue) : "—"}</td>
      <td>${a.dpe ?? "—"}</td>
    </tr>`,
    )
    .join("");

  const leasesRows = activeLeases
    .map(
      (l) => `
    <tr>
      <td>${l.reference}</td>
      <td>${d.assetMap.get(l.assetId) ?? "—"}</td>
      <td>${d.tenantMap.get(l.tenantId) ?? "—"}</td>
      <td>${l.type}</td>
      <td>${formatCurrency(l.baseRent)}</td>
      <td>${formatDate(l.endDate)}</td>
    </tr>`,
    )
    .join("");

  const loansRows = d.loans
    .map((loan) => {
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
      return `<tr>
      <td>${loan.reference}</td>
      <td>${d.assetMap.get(loan.assetId) ?? "—"}</td>
      <td>${loan.bank}</td>
      <td>${formatCurrency(loan.initialAmount)}</td>
      <td>${loan.interestRate}%</td>
      <td>${formatCurrency(loan.monthlyPayment)}</td>
      <td>${formatCurrency(outstanding)}</td>
      <td>${formatDate(loan.endDate)}</td>
    </tr>`;
    })
    .join("");

  return htmlDoc(
    "Rapport de portefeuille",
    `
    <h1>Rapport de portefeuille</h1>
    <div class="meta">Généré le ${d.generatedAt}</div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Actifs</div><div class="kpi-value">${d.assets.length}</div></div>
      <div class="kpi"><div class="kpi-label">Loyer mensuel brut</div><div class="kpi-value">${formatCurrency(monthlyRent)}</div></div>
      <div class="kpi"><div class="kpi-label">Valeur totale</div><div class="kpi-value">${totalValue > 0 ? formatCurrency(totalValue) : "—"}</div></div>
      <div class="kpi"><div class="kpi-label">Taux d'occupation</div><div class="kpi-value">${occupancy}%</div></div>
      <div class="kpi"><div class="kpi-label">Rendement net</div><div class="kpi-value">${netYield !== "—" ? netYield + "%" : "—"}</div></div>
      <div class="kpi"><div class="kpi-label">Dette totale</div><div class="kpi-value">${totalDebt > 0 ? formatCurrency(totalDebt) : "—"}</div></div>
      <div class="kpi"><div class="kpi-label">LTV</div><div class="kpi-value">${totalValue > 0 && totalDebt > 0 ? ((totalDebt / totalValue) * 100).toFixed(1) + "%" : "—"}</div></div>
      <div class="kpi"><div class="kpi-label">Baux actifs</div><div class="kpi-value">${activeLeases.length}</div></div>
    </div>
    <h2>Actifs (${d.assets.length})</h2>
    <table><thead><tr><th>Nom</th><th>Type</th><th>Statut</th><th>Entité</th><th>Surface</th><th>Prix acq.</th><th>Valeur</th><th>DPE</th></tr></thead><tbody>${assetsRows}</tbody></table>
    <h2>Baux actifs (${activeLeases.length})</h2>
    <table><thead><tr><th>Référence</th><th>Actif</th><th>Locataire</th><th>Type</th><th>Loyer/mois</th><th>Échéance</th></tr></thead><tbody>${leasesRows}</tbody></table>
    <h2>Emprunts (${d.loans.length})</h2>
    <table><thead><tr><th>Référence</th><th>Actif</th><th>Banque</th><th>Capital initial</th><th>Taux</th><th>Mensualité</th><th>Restant dû</th><th>Fin</th></tr></thead><tbody>${loansRows}</tbody></table>
  `,
  );
}

export function buildAssetHTML(d: AssetReportData): string {
  const activeLeases = d.assetLeases.filter((l) => l.status === "Actif");
  const monthlyRent = activeLeases.reduce((s, l) => s + l.baseRent + (l.charges ?? 0), 0);
  const totalDebt = d.assetLoans.reduce((s, loan) => {
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
    return s + outstanding;
  }, 0);
  const annualDebt = d.assetLoans.reduce((s, l) => s + l.monthlyPayment * 12, 0);
  const dscr = annualDebt > 0 ? (monthlyRent * 12) / annualDebt : null;
  const netYield =
    d.asset.currentMarketValue && monthlyRent > 0
      ? (((monthlyRent * 12) / d.asset.currentMarketValue) * 100).toFixed(2)
      : null;

  const leasesRows = d.assetLeases
    .map(
      (l) => `<tr>
    <td>${l.reference}</td>
    <td>${d.tenantMap.get(l.tenantId) ?? "—"}</td>
    <td>${l.type}</td>
    <td>${statusBadge(l.status)}</td>
    <td>${formatCurrency(l.baseRent)}${l.charges ? ` + ${formatCurrency(l.charges)}` : ""}</td>
    <td>${formatDate(l.startDate)} → ${formatDate(l.endDate)}</td>
  </tr>`,
    )
    .join("");

  const loansRows = d.assetLoans
    .map((loan) => {
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
      return `<tr>
      <td>${loan.reference}</td>
      <td>${loan.bank}</td>
      <td>${formatCurrency(loan.initialAmount)}</td>
      <td>${loan.interestRate}%</td>
      <td>${formatCurrency(loan.monthlyPayment)}</td>
      <td>${formatCurrency(outstanding)}</td>
    </tr>`;
    })
    .join("");

  return htmlDoc(
    `Fiche actif — ${d.asset.name}`,
    `
    <h1>Fiche actif — ${d.asset.name}</h1>
    <div class="meta">${d.asset.address} · Généré le ${d.generatedAt}</div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Type</div><div class="kpi-value">${d.asset.type}</div></div>
      <div class="kpi"><div class="kpi-label">Statut</div><div class="kpi-value">${d.asset.status}</div></div>
      <div class="kpi"><div class="kpi-label">Surface</div><div class="kpi-value">${d.asset.surfaceM2 ? `${d.asset.surfaceM2} m²` : "—"}</div></div>
      <div class="kpi"><div class="kpi-label">DPE</div><div class="kpi-value">${d.asset.dpe ?? "—"}</div></div>
      <div class="kpi"><div class="kpi-label">Prix d'acquisition</div><div class="kpi-value">${d.asset.acquisitionPrice ? formatCurrency(d.asset.acquisitionPrice) : "—"}</div></div>
      <div class="kpi"><div class="kpi-label">Valeur de marché</div><div class="kpi-value">${d.asset.currentMarketValue ? formatCurrency(d.asset.currentMarketValue) : "—"}</div></div>
      <div class="kpi"><div class="kpi-label">Loyer mensuel</div><div class="kpi-value">${formatCurrency(monthlyRent)}</div></div>
      <div class="kpi"><div class="kpi-label">Rendement net</div><div class="kpi-value">${netYield ? netYield + "%" : "—"}</div></div>
    </div>
    ${dscr !== null && dscr < 1 ? `<div class="alert">⚠ Alerte DSCR : ${dscr.toFixed(2)} — Les revenus locatifs ne couvrent pas le service de la dette.</div>` : ""}
    <h2>Informations</h2>
    <table><tbody>
      <tr><td><strong>Entité juridique</strong></td><td>${d.entity?.name ?? "—"} (${d.entity?.type ?? "—"})</td><td><strong>Régime fiscal</strong></td><td>${d.entity?.taxRegime ?? "—"}</td></tr>
      <tr><td><strong>Détention</strong></td><td>${d.asset.ownershipPercent ? formatPercent(d.asset.ownershipPercent) : "—"}</td><td><strong>Date d'acquisition</strong></td><td>${d.asset.acquisitionDate ? formatDate(d.asset.acquisitionDate) : "—"}</td></tr>
      <tr><td><strong>DSCR</strong></td><td>${dscr !== null ? dscr.toFixed(2) : "—"}</td><td><strong>Capital restant dû</strong></td><td>${totalDebt > 0 ? formatCurrency(totalDebt) : "—"}</td></tr>
    </tbody></table>
    <h2>Baux (${d.assetLeases.length})</h2>
    <table><thead><tr><th>Référence</th><th>Locataire</th><th>Type</th><th>Statut</th><th>Loyer</th><th>Période</th></tr></thead><tbody>${leasesRows || "<tr><td colspan='6'>Aucun bail</td></tr>"}</tbody></table>
    <h2>Emprunts (${d.assetLoans.length})</h2>
    <table><thead><tr><th>Référence</th><th>Banque</th><th>Capital initial</th><th>Taux</th><th>Mensualité</th><th>Restant dû</th></tr></thead><tbody>${loansRows || "<tr><td colspan='6'>Aucun emprunt</td></tr>"}</tbody></table>
    ${d.asset.notes ? `<h2>Notes</h2><p style="white-space:pre-wrap;font-size:10px;">${d.asset.notes}</p>` : ""}
  `,
  );
}

export function buildCashFlowHTML(d: CashFlowReportData): string {
  const txIn = d.transactions
    .filter((t) => t.direction === "Encaissement")
    .reduce((s, t) => s + t.amount, 0);
  const txOut = d.transactions
    .filter((t) => t.direction === "Décaissement")
    .reduce((s, t) => s + t.amount, 0);
  const net = txIn - txOut;

  const rows = d.transactions
    .map(
      (tx) => `<tr>
    <td>${formatDate(tx.date)}</td>
    <td>${tx.label}</td>
    <td>${tx.type}</td>
    <td>${d.assetMap.get(tx.assetId ?? "") ?? "—"}</td>
    <td class="${tx.direction === "Encaissement" ? "positive" : "negative"}">${tx.direction === "Encaissement" ? "+" : "-"}${formatCurrency(tx.amount)}</td>
    <td>${tx.reconciled ? "✓" : "⏳"}</td>
  </tr>`,
    )
    .join("");

  return htmlDoc(
    "Flux mensuel",
    `
    <h1>Tableau de flux</h1>
    <div class="meta">Période : ${formatDate(d.dateFrom)} → ${formatDate(d.dateTo)} · Généré le ${d.generatedAt}</div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Encaissements</div><div class="kpi-value positive">${formatCurrency(txIn)}</div></div>
      <div class="kpi"><div class="kpi-label">Décaissements</div><div class="kpi-value negative">${formatCurrency(txOut)}</div></div>
      <div class="kpi"><div class="kpi-label">Net</div><div class="kpi-value ${net >= 0 ? "positive" : "negative"}">${net >= 0 ? "+" : ""}${formatCurrency(net)}</div></div>
      <div class="kpi"><div class="kpi-label">Transactions</div><div class="kpi-value">${d.transactions.length}</div></div>
    </div>
    <h2>Transactions (${d.transactions.length})</h2>
    <table><thead><tr><th>Date</th><th>Libellé</th><th>Type</th><th>Actif</th><th>Montant</th><th>Réconcilié</th></tr></thead><tbody>${rows || "<tr><td colspan='6'>Aucune transaction sur la période</td></tr>"}</tbody></table>
  `,
  );
}

export function buildFiscalHTML(d: FiscalReportData): string {
  const rows = d.entities
    .map((entity) => {
      const entityTx = d.transactions.filter((t) => t.legalEntityId === entity.id);
      const revenues = entityTx
        .filter((t) => t.direction === "Encaissement")
        .reduce((s, t) => s + t.amount, 0);
      const expenses = entityTx
        .filter((t) => t.direction === "Décaissement")
        .reduce((s, t) => s + t.amount, 0);
      const entityAssets = d.assets.filter((a) => a.legalEntityId === entity.id);
      const entityLeases = d.leases.filter(
        (l) => entityAssets.some((a) => a.id === l.assetId) && l.status === "Actif",
      );
      const rentRoll = entityLeases.reduce((s, l) => s + l.baseRent + (l.charges ?? 0), 0);
      return `<tr>
      <td><strong>${entity.name}</strong></td>
      <td>${entity.type}</td>
      <td>${entity.taxRegime ?? "—"}</td>
      <td>${entityAssets.length}</td>
      <td class="positive">${formatCurrency(revenues)}</td>
      <td class="negative">${formatCurrency(expenses)}</td>
      <td class="${revenues - expenses >= 0 ? "positive" : "negative"}">${revenues - expenses >= 0 ? "+" : ""}${formatCurrency(revenues - expenses)}</td>
      <td>${formatCurrency(rentRoll * 12)}</td>
    </tr>`;
    })
    .join("");

  const totalRevenues = d.transactions
    .filter((t) => t.direction === "Encaissement")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = d.transactions
    .filter((t) => t.direction === "Décaissement")
    .reduce((s, t) => s + t.amount, 0);

  return htmlDoc(
    `Synthèse fiscale ${d.year}`,
    `
    <h1>Synthèse fiscale ${d.year}</h1>
    <div class="meta">Généré le ${d.generatedAt}</div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Revenus bruts</div><div class="kpi-value positive">${formatCurrency(totalRevenues)}</div></div>
      <div class="kpi"><div class="kpi-label">Charges</div><div class="kpi-value negative">${formatCurrency(totalExpenses)}</div></div>
      <div class="kpi"><div class="kpi-label">Résultat net</div><div class="kpi-value ${totalRevenues - totalExpenses >= 0 ? "positive" : "negative"}">${formatCurrency(totalRevenues - totalExpenses)}</div></div>
      <div class="kpi"><div class="kpi-label">Entités</div><div class="kpi-value">${d.entities.length}</div></div>
    </div>
    <h2>Détail par entité juridique</h2>
    <table><thead><tr><th>Entité</th><th>Type</th><th>Régime</th><th>Actifs</th><th>Encaissements</th><th>Décaissements</th><th>Net</th><th>Loyer annuel</th></tr></thead><tbody>${rows || "<tr><td colspan='8'>Aucune entité</td></tr>"}</tbody></table>
  `,
  );
}

export function buildLoanPlanHTML(d: LoanPlanData): string {
  const today = new Date().toISOString().slice(0, 10);
  const currentIdx = d.schedule.findLastIndex((l) => l.periodDate <= today);
  const currentLine = currentIdx >= 0 ? d.schedule[currentIdx] : d.schedule[0];
  const totalInterest = d.schedule.reduce((s, l) => s + l.interestPayment, 0);
  const totalInsurance = d.schedule.reduce((s, l) => s + (l.insurancePayment ?? 0), 0);

  const scheduleRows = d.schedule
    .map(
      (line, i) => `
    <tr class="${i === currentIdx ? "current-row" : ""}">
      <td>${formatDate(line.periodDate)}${i === currentIdx ? " ◀" : ""}</td>
      <td class="positive">${formatCurrency(line.capitalPayment)}</td>
      <td class="negative">${formatCurrency(line.interestPayment)}</td>
      <td>${line.insurancePayment ? formatCurrency(line.insurancePayment) : "—"}</td>
      <td><strong>${formatCurrency(line.totalPayment)}</strong></td>
      <td>${formatCurrency(line.remainingCapital)}</td>
    </tr>`,
    )
    .join("");

  return htmlDoc(
    `Plan de financement — ${d.loan.reference}`,
    `
    <h1>Plan de financement — ${d.loan.reference}</h1>
    <div class="meta">${d.loan.bank} · Actif : ${d.asset?.name ?? "—"} · Généré le ${d.generatedAt} · ${d.loan.parsed ? "Tableau parsé depuis PDF" : "Tableau théorique"}</div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Capital initial</div><div class="kpi-value">${formatCurrency(d.loan.initialAmount)}</div></div>
      <div class="kpi"><div class="kpi-label">Taux d'intérêt</div><div class="kpi-value">${d.loan.interestRate}%</div></div>
      <div class="kpi"><div class="kpi-label">Mensualité</div><div class="kpi-value">${formatCurrency(d.loan.monthlyPayment)}</div></div>
      <div class="kpi"><div class="kpi-label">Capital restant</div><div class="kpi-value">${currentLine ? formatCurrency(currentLine.remainingCapital) : "—"}</div></div>
      <div class="kpi"><div class="kpi-label">Coût total intérêts</div><div class="kpi-value negative">${formatCurrency(totalInterest)}</div></div>
      <div class="kpi"><div class="kpi-label">Coût assurance</div><div class="kpi-value">${totalInsurance > 0 ? formatCurrency(totalInsurance) : "—"}</div></div>
      <div class="kpi"><div class="kpi-label">Durée</div><div class="kpi-value">${d.schedule.length} mois</div></div>
      <div class="kpi"><div class="kpi-label">Fin</div><div class="kpi-value">${formatDate(d.loan.endDate)}</div></div>
    </div>
    <h2>Tableau d'amortissement (${d.schedule.length} lignes)</h2>
    <table><thead><tr><th>Période</th><th>Capital</th><th>Intérêts</th><th>Assurance</th><th>Total</th><th>Restant dû</th></tr></thead><tbody>${scheduleRows}</tbody></table>
  `,
  );
}

export function buildTenantReportHTML(d: TenantReportData): string {
  const txIn = d.transactions
    .filter((t) => t.direction === "Encaissement")
    .reduce((s, t) => s + t.amount, 0);
  const txRows = d.transactions
    .map(
      (tx) => `<tr>
    <td>${formatDate(tx.date)}</td>
    <td>${tx.label}</td>
    <td>${tx.type}</td>
    <td class="${tx.direction === "Encaissement" ? "positive" : "negative"}">${tx.direction === "Encaissement" ? "+" : "-"}${formatCurrency(tx.amount)}</td>
    <td>${tx.reconciled ? "✓ Réconcilié" : "⏳ En attente"}</td>
  </tr>`,
    )
    .join("");

  return htmlDoc(
    `Rapport locataire — ${d.tenant?.name ?? d.lease.reference}`,
    `
    <h1>Rapport locataire — ${d.tenant?.name ?? "—"}</h1>
    <div class="meta">Bail ${d.lease.reference} · Actif : ${d.asset?.name ?? "—"} · Généré le ${d.generatedAt}</div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Type locataire</div><div class="kpi-value">${d.tenant?.type ?? "—"}</div></div>
      <div class="kpi"><div class="kpi-label">Score paiement</div><div class="kpi-value">${d.tenant?.paymentScore ?? "—"}</div></div>
      <div class="kpi"><div class="kpi-label">Loyer mensuel</div><div class="kpi-value">${formatCurrency(d.lease.baseRent)}</div></div>
      <div class="kpi"><div class="kpi-label">Statut bail</div><div class="kpi-value">${d.lease.status}</div></div>
    </div>
    <h2>Informations locataire</h2>
    <table><tbody>
      ${d.tenant?.email ? `<tr><td><strong>Email</strong></td><td>${d.tenant.email}</td></tr>` : ""}
      ${d.tenant?.phone ? `<tr><td><strong>Téléphone</strong></td><td>${d.tenant.phone}</td></tr>` : ""}
      ${d.tenant?.siret ? `<tr><td><strong>SIRET</strong></td><td>${d.tenant.siret}</td></tr>` : ""}
      ${d.tenant?.guarantorName ? `<tr><td><strong>Garant</strong></td><td>${d.tenant.guarantorName}${d.tenant.guarantorContact ? ` — ${d.tenant.guarantorContact}` : ""}</td></tr>` : ""}
    </tbody></table>
    <h2>Détails du bail</h2>
    <table><tbody>
      <tr><td><strong>Référence</strong></td><td>${d.lease.reference}</td><td><strong>Type</strong></td><td>${d.lease.type}</td></tr>
      <tr><td><strong>Début</strong></td><td>${formatDate(d.lease.startDate)}</td><td><strong>Fin</strong></td><td>${formatDate(d.lease.endDate)}</td></tr>
      <tr><td><strong>Loyer base</strong></td><td>${formatCurrency(d.lease.baseRent)}/mois</td><td><strong>Charges</strong></td><td>${d.lease.charges ? formatCurrency(d.lease.charges) + "/mois" : "—"}</td></tr>
      <tr><td><strong>TVA</strong></td><td>${d.lease.tvaApplicable ? "Oui" : "Non"}</td><td><strong>Indexation</strong></td><td>${d.lease.indexationIndex ?? "—"}</td></tr>
    </tbody></table>
    <h2>Historique de paiement (${d.transactions.length} transactions · Total encaissé : ${formatCurrency(txIn)})</h2>
    <table><thead><tr><th>Date</th><th>Libellé</th><th>Type</th><th>Montant</th><th>Statut</th></tr></thead><tbody>${txRows || "<tr><td colspan='5'>Aucune transaction</td></tr>"}</tbody></table>
  `,
  );
}
