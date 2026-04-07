import {
  Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
  HeadingLevel, WidthType, AlignmentType, BorderStyle, ShadingType,
  convertInchesToTwip,
} from "docx";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { generateAmortizationSchedule, estimateOutstandingCapital } from "@/lib/amortization";
import type {
  PortfolioReportData, AssetReportData, CashFlowReportData,
  FiscalReportData, LoanPlanData, TenantReportData,
} from "./data";

const BRAND_COLOR = "1E40AF";
const HEADER_BG = "EFF6FF";

function docHeader(title: string, subtitle: string): Paragraph[] {
  return [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      thematicBreak: false,
    }),
    new Paragraph({
      children: [new TextRun({ text: subtitle, color: "94A3B8", size: 18 })],
      spacing: { after: 300 },
    }),
  ];
}

function kpiRow(items: { label: string; value: string }[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: items.map((item) =>
          new TableCell({
            shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({ children: [new TextRun({ text: item.label, size: 16, color: "94A3B8" })] }),
              new Paragraph({ children: [new TextRun({ text: item.value, bold: true, size: 22, color: "0F172A" })] }),
            ],
          }),
        ),
      }),
    ],
  });
}

function buildTable(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h) =>
          new TableCell({
            shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: "475569" })] })],
          }),
        ),
      }),
      ...rows.map((row) =>
        new TableRow({
          children: row.map((cell) =>
            new TableCell({
              margins: { top: 50, bottom: 50, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18 })] })],
            }),
          ),
        }),
      ),
    ],
  });
}

function section(title: string): Paragraph {
  return new Paragraph({
    text: title,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
  });
}

function footer(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `PatrimNet · Généré le ${new Date().toLocaleDateString("fr-FR")} · Document confidentiel`, color: "CBD5E1", size: 16 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" } },
  });
}

export async function buildPortfolioDocx(d: PortfolioReportData): Promise<Buffer> {
  const activeLeases = d.leases.filter((l) => l.status === "Actif");
  const monthlyRent = activeLeases.reduce((s, l) => s + l.baseRent + (l.charges ?? 0), 0);
  const totalValue = d.assets.reduce((s, a) => s + (a.currentMarketValue ?? 0), 0);

  const doc = new Document({
    sections: [{
      children: [
        ...docHeader("Rapport de portefeuille", `Généré le ${d.generatedAt}`),
        kpiRow([
          { label: "Actifs", value: d.assets.length.toString() },
          { label: "Loyer mensuel", value: formatCurrency(monthlyRent) },
          { label: "Valeur totale", value: totalValue > 0 ? formatCurrency(totalValue) : "—" },
          { label: "Baux actifs", value: activeLeases.length.toString() },
        ]),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        section("Actifs immobiliers"),
        buildTable(
          ["Nom", "Type", "Statut", "Entité", "Surface", "Valeur marché"],
          d.assets.map((a) => [
            a.name, a.type, a.status,
            d.entityMap.get(a.legalEntityId) ?? "—",
            a.surfaceM2 ? `${a.surfaceM2} m²` : "—",
            a.currentMarketValue ? formatCurrency(a.currentMarketValue) : "—",
          ]),
        ),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        section("Baux actifs"),
        buildTable(
          ["Référence", "Actif", "Locataire", "Type", "Loyer/mois", "Échéance"],
          activeLeases.map((l) => [
            l.reference,
            d.assetMap.get(l.assetId) ?? "—",
            d.tenantMap.get(l.tenantId) ?? "—",
            l.type,
            formatCurrency(l.baseRent),
            formatDate(l.endDate),
          ]),
        ),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        section("Emprunts"),
        buildTable(
          ["Référence", "Banque", "Capital initial", "Taux", "Mensualité", "Restant dû"],
          d.loans.map((loan) => {
            const outstanding = loan.outstandingCapital ?? estimateOutstandingCapital(
              generateAmortizationSchedule({ loanId: loan.id, initialAmount: loan.initialAmount, annualInterestRate: loan.interestRate, monthlyPayment: loan.monthlyPayment, startDate: loan.startDate, endDate: loan.endDate }),
            );
            return [loan.reference, loan.bank, formatCurrency(loan.initialAmount), `${loan.interestRate}%`, formatCurrency(loan.monthlyPayment), formatCurrency(outstanding)];
          }),
        ),
        footer(),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function buildAssetDocx(d: AssetReportData): Promise<Buffer> {
  const activeLeases = d.assetLeases.filter((l) => l.status === "Actif");
  const monthlyRent = activeLeases.reduce((s, l) => s + l.baseRent + (l.charges ?? 0), 0);
  const netYield = d.asset.currentMarketValue && monthlyRent > 0
    ? ((monthlyRent * 12 / d.asset.currentMarketValue) * 100).toFixed(2) + "%" : "—";

  const doc = new Document({
    sections: [{
      children: [
        ...docHeader(`Fiche actif — ${d.asset.name}`, `${d.asset.address} · ${d.generatedAt}`),
        kpiRow([
          { label: "Type", value: d.asset.type },
          { label: "Statut", value: d.asset.status },
          { label: "Surface", value: d.asset.surfaceM2 ? `${d.asset.surfaceM2} m²` : "—" },
          { label: "Rendement net", value: netYield },
        ]),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        section("Baux"),
        buildTable(
          ["Référence", "Locataire", "Type", "Statut", "Loyer", "Période"],
          d.assetLeases.map((l) => [
            l.reference, d.tenantMap.get(l.tenantId) ?? "—", l.type, l.status,
            `${formatCurrency(l.baseRent)}/mois`,
            `${formatDate(l.startDate)} → ${formatDate(l.endDate)}`,
          ]),
        ),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        section("Emprunts"),
        buildTable(
          ["Référence", "Banque", "Capital", "Taux", "Mensualité", "Restant"],
          d.assetLoans.map((loan) => {
            const outstanding = loan.outstandingCapital ?? estimateOutstandingCapital(
              generateAmortizationSchedule({ loanId: loan.id, initialAmount: loan.initialAmount, annualInterestRate: loan.interestRate, monthlyPayment: loan.monthlyPayment, startDate: loan.startDate, endDate: loan.endDate }),
            );
            return [loan.reference, loan.bank, formatCurrency(loan.initialAmount), `${loan.interestRate}%`, formatCurrency(loan.monthlyPayment), formatCurrency(outstanding)];
          }),
        ),
        footer(),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function buildCashFlowDocx(d: CashFlowReportData): Promise<Buffer> {
  const txIn = d.transactions.filter((t) => t.direction === "Encaissement").reduce((s, t) => s + t.amount, 0);
  const txOut = d.transactions.filter((t) => t.direction === "Décaissement").reduce((s, t) => s + t.amount, 0);

  const doc = new Document({
    sections: [{
      children: [
        ...docHeader("Tableau de flux", `${formatDate(d.dateFrom)} → ${formatDate(d.dateTo)} · ${d.generatedAt}`),
        kpiRow([
          { label: "Encaissements", value: formatCurrency(txIn) },
          { label: "Décaissements", value: formatCurrency(txOut) },
          { label: "Net", value: formatCurrency(txIn - txOut) },
          { label: "Transactions", value: d.transactions.length.toString() },
        ]),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        section("Transactions"),
        buildTable(
          ["Date", "Libellé", "Type", "Actif", "Montant", "Sens", "Réconcilié"],
          d.transactions.map((tx) => [
            formatDate(tx.date), tx.label, tx.type,
            d.assetMap.get(tx.assetId ?? "") ?? "—",
            formatCurrency(tx.amount), tx.direction,
            tx.reconciled ? "Oui" : "Non",
          ]),
        ),
        footer(),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function buildFiscalDocx(d: FiscalReportData): Promise<Buffer> {
  const totalRevenues = d.transactions.filter((t) => t.direction === "Encaissement").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = d.transactions.filter((t) => t.direction === "Décaissement").reduce((s, t) => s + t.amount, 0);

  const doc = new Document({
    sections: [{
      children: [
        ...docHeader(`Synthèse fiscale ${d.year}`, `Généré le ${d.generatedAt}`),
        kpiRow([
          { label: "Revenus bruts", value: formatCurrency(totalRevenues) },
          { label: "Charges", value: formatCurrency(totalExpenses) },
          { label: "Résultat net", value: formatCurrency(totalRevenues - totalExpenses) },
          { label: "Entités", value: d.entities.length.toString() },
        ]),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        section("Détail par entité"),
        buildTable(
          ["Entité", "Type", "Régime", "Encaissements", "Décaissements", "Net"],
          d.entities.map((entity) => {
            const entityTx = d.transactions.filter((t) => t.legalEntityId === entity.id);
            const rev = entityTx.filter((t) => t.direction === "Encaissement").reduce((s, t) => s + t.amount, 0);
            const exp = entityTx.filter((t) => t.direction === "Décaissement").reduce((s, t) => s + t.amount, 0);
            return [entity.name, entity.type, entity.taxRegime ?? "—", formatCurrency(rev), formatCurrency(exp), formatCurrency(rev - exp)];
          }),
        ),
        footer(),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function buildLoanPlanDocx(d: LoanPlanData): Promise<Buffer> {
  const totalInterest = d.schedule.reduce((s, l) => s + l.interestPayment, 0);
  const today = new Date().toISOString().slice(0, 10);
  const currentLine = d.schedule.filter((l) => l.periodDate <= today).slice(-1)[0] ?? d.schedule[0];

  const doc = new Document({
    sections: [{
      children: [
        ...docHeader(`Plan de financement — ${d.loan.reference}`, `${d.loan.bank} · ${d.asset?.name ?? "—"} · ${d.generatedAt}`),
        kpiRow([
          { label: "Capital initial", value: formatCurrency(d.loan.initialAmount) },
          { label: "Taux", value: `${d.loan.interestRate}%` },
          { label: "Mensualité", value: formatCurrency(d.loan.monthlyPayment) },
          { label: "Capital restant", value: currentLine ? formatCurrency(currentLine.remainingCapital) : "—" },
        ]),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        new Paragraph({
          children: [new TextRun({ text: `Coût total des intérêts : ${formatCurrency(totalInterest)} · Durée : ${d.schedule.length} mois`, size: 18, color: "475569" })],
          spacing: { after: 200 },
        }),
        section("Tableau d'amortissement"),
        buildTable(
          ["Période", "Capital", "Intérêts", "Assurance", "Total", "Restant dû"],
          d.schedule.map((line) => [
            formatDate(line.periodDate),
            formatCurrency(line.capitalPayment),
            formatCurrency(line.interestPayment),
            line.insurancePayment ? formatCurrency(line.insurancePayment) : "—",
            formatCurrency(line.totalPayment),
            formatCurrency(line.remainingCapital),
          ]),
        ),
        footer(),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function buildTenantReportDocx(d: TenantReportData): Promise<Buffer> {
  const txIn = d.transactions.filter((t) => t.direction === "Encaissement").reduce((s, t) => s + t.amount, 0);

  const doc = new Document({
    sections: [{
      children: [
        ...docHeader(
          `Rapport locataire — ${d.tenant?.name ?? d.lease.reference}`,
          `Bail ${d.lease.reference} · ${d.asset?.name ?? "—"} · ${d.generatedAt}`,
        ),
        kpiRow([
          { label: "Loyer mensuel", value: formatCurrency(d.lease.baseRent) },
          { label: "Statut", value: d.lease.status },
          { label: "Score paiement", value: d.tenant?.paymentScore ?? "—" },
          { label: "Total encaissé", value: formatCurrency(txIn) },
        ]),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        section("Informations locataire"),
        buildTable(
          ["Champ", "Valeur"],
          [
            ["Nom", d.tenant?.name ?? "—"],
            ["Type", d.tenant?.type ?? "—"],
            ["Email", d.tenant?.email ?? "—"],
            ["Téléphone", d.tenant?.phone ?? "—"],
            ["SIRET", d.tenant?.siret ?? "—"],
            ["Garant", d.tenant?.guarantorName ?? "—"],
          ],
        ),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        section("Historique de paiement"),
        buildTable(
          ["Date", "Libellé", "Type", "Montant", "Réconcilié"],
          d.transactions.map((tx) => [
            formatDate(tx.date), tx.label, tx.type,
            `${tx.direction === "Encaissement" ? "+" : "-"}${formatCurrency(tx.amount)}`,
            tx.reconciled ? "Oui" : "Non",
          ]),
        ),
        footer(),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
