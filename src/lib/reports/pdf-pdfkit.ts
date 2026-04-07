import PDFDocument from "pdfkit";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateAmortizationSchedule, estimateOutstandingCapital } from "@/lib/amortization";
import type {
  PortfolioReportData,
  AssetReportData,
  CashFlowReportData,
  FiscalReportData,
  LoanPlanData,
  TenantReportData,
} from "./data";

// ─── Constants ──────────────────────────────────────────────────────────────

const C = {
  brand: "#1E40AF",
  dark: "#0F172A",
  muted: "#94A3B8",
  slate: "#475569",
  border: "#E2E8F0",
  rowAlt: "#F8FAFC",
  headerBg: "#F1F5F9",
  green: "#16A34A",
  red: "#DC2626",
  amber: "#D97706",
} as const;

const PAGE = { left: 50, right: 50, top: 50, bottom: 50, width: 495 } as const;

// ─── Core helpers ───────────────────────────────────────────────────────────

function makePdf(): PDFKit.PDFDocument {
  return new PDFDocument({
    size: "A4",
    margins: { top: PAGE.top, bottom: PAGE.bottom, left: PAGE.left, right: PAGE.right },
    info: { Creator: "PatrimNet", Producer: "PDFKit" },
  });
}

function collectBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function addPageFooter(doc: PDFKit.PDFDocument): void {
  const y = doc.page.height - 35;
  doc
    .moveTo(PAGE.left, y)
    .lineTo(PAGE.left + PAGE.width, y)
    .strokeColor(C.border)
    .lineWidth(0.5)
    .stroke();
  doc
    .fontSize(7)
    .fillColor(C.muted)
    .font("Helvetica")
    .text(
      `PatrimNet · Généré le ${new Date().toLocaleDateString("fr-FR")} · Document confidentiel`,
      PAGE.left,
      y + 6,
      { width: PAGE.width, align: "center" },
    );
}

function title(doc: PDFKit.PDFDocument, t: string, sub: string): void {
  // Blue accent bar
  doc.rect(PAGE.left, PAGE.top - 10, 4, 28).fill(C.brand);
  doc
    .fontSize(16)
    .fillColor(C.dark)
    .font("Helvetica-Bold")
    .text(t, PAGE.left + 12, PAGE.top - 8);
  doc
    .fontSize(8)
    .fillColor(C.muted)
    .font("Helvetica")
    .text(sub, PAGE.left + 12, doc.y + 2);
  doc.moveDown(1.2);
}

function sectionTitle(doc: PDFKit.PDFDocument, t: string): void {
  doc.moveDown(0.6);
  doc.fontSize(10).fillColor(C.brand).font("Helvetica-Bold").text(t, PAGE.left);
  doc
    .moveTo(PAGE.left, doc.y + 2)
    .lineTo(PAGE.left + PAGE.width, doc.y + 2)
    .strokeColor(C.border)
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.5);
}

function kpis(doc: PDFKit.PDFDocument, items: { label: string; value: string }[]): void {
  const perRow = 4;
  const boxW = Math.floor(PAGE.width / perRow);
  const boxH = 44;

  for (let row = 0; row < Math.ceil(items.length / perRow); row++) {
    const rowItems = items.slice(row * perRow, row * perRow + perRow);
    const startY = doc.y;
    rowItems.forEach((item, i) => {
      const x = PAGE.left + i * boxW;
      doc.rect(x + 1, startY, boxW - 3, boxH).fillAndStroke(C.rowAlt, C.border);
      doc
        .fontSize(7)
        .fillColor(C.muted)
        .font("Helvetica")
        .text(item.label.toUpperCase(), x + 7, startY + 7, { width: boxW - 14, lineBreak: false });
      doc
        .fontSize(11)
        .fillColor(C.dark)
        .font("Helvetica-Bold")
        .text(item.value, x + 7, startY + 20, { width: boxW - 14, lineBreak: false });
    });
    doc.y = startY + boxH + 6;
  }
  doc.moveDown(0.3);
}

function table(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  opts?: { colWidths?: number[]; colAligns?: ("left" | "right")[] },
): void {
  const n = headers.length;
  const defaultW = Math.floor(PAGE.width / n);
  const colW = opts?.colWidths ?? Array(n).fill(defaultW);
  const colAlign = opts?.colAligns ?? Array(n).fill("left");
  const ROW_H = 18;
  const HEAD_H = 20;

  // Header
  const hY = doc.y;
  doc.rect(PAGE.left, hY, PAGE.width, HEAD_H).fill(C.headerBg);
  let cx = PAGE.left;
  headers.forEach((h, i) => {
    doc
      .fontSize(8)
      .fillColor(C.slate)
      .font("Helvetica-Bold")
      .text(h, cx + 4, hY + 5, { width: colW[i] - 8, align: colAlign[i], lineBreak: false });
    cx += colW[i];
  });
  doc.y = hY + HEAD_H;

  rows.forEach((row, ri) => {
    // Page break guard
    if (doc.y + ROW_H > doc.page.height - PAGE.bottom - 20) {
      doc.addPage();
    }
    const rY = doc.y;
    if (ri % 2 === 1) {
      doc.rect(PAGE.left, rY, PAGE.width, ROW_H).fill(C.rowAlt);
    }
    cx = PAGE.left;
    row.forEach((cell, ci) => {
      doc
        .fontSize(8)
        .fillColor(C.dark)
        .font("Helvetica")
        .text(cell ?? "—", cx + 4, rY + 4, {
          width: colW[ci] - 8,
          align: colAlign[ci],
          lineBreak: false,
        });
      cx += colW[ci];
    });
    doc.y = rY + ROW_H;
    doc
      .moveTo(PAGE.left, doc.y)
      .lineTo(PAGE.left + PAGE.width, doc.y)
      .strokeColor(C.border)
      .lineWidth(0.3)
      .stroke();
  });
  doc.moveDown(0.5);
}

// ─── Report builders ────────────────────────────────────────────────────────

export async function buildPortfolioPdf(d: PortfolioReportData): Promise<Buffer> {
  const doc = makePdf();
  const p = collectBuffer(doc);

  const activeLeases = d.leases.filter((l) => l.status === "Actif");
  const monthlyRent = activeLeases.reduce((s, l) => s + l.baseRent + (l.charges ?? 0), 0);
  const totalValue = d.assets.reduce((s, a) => s + (a.currentMarketValue ?? 0), 0);
  const totalDebt = d.loans.reduce((s, loan) => {
    const out =
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
    return s + out;
  }, 0);
  const occupancy =
    d.leases.length > 0 ? ((activeLeases.length / d.leases.length) * 100).toFixed(1) + "%" : "—";
  const netYield =
    totalValue > 0 ? (((monthlyRent * 12) / totalValue) * 100).toFixed(2) + "%" : "—";

  title(doc, "Rapport de portefeuille", `Généré le ${d.generatedAt}`);

  kpis(doc, [
    { label: "Actifs", value: d.assets.length.toString() },
    { label: "Loyer mensuel brut", value: formatCurrency(monthlyRent) },
    { label: "Valeur totale", value: totalValue > 0 ? formatCurrency(totalValue) : "—" },
    { label: "Taux d'occupation", value: occupancy },
    { label: "Rendement net", value: netYield },
    { label: "Dette totale", value: totalDebt > 0 ? formatCurrency(totalDebt) : "—" },
    {
      label: "LTV",
      value:
        totalValue > 0 && totalDebt > 0 ? ((totalDebt / totalValue) * 100).toFixed(1) + "%" : "—",
    },
    { label: "Baux actifs", value: activeLeases.length.toString() },
  ]);

  sectionTitle(doc, `Actifs (${d.assets.length})`);
  table(
    doc,
    ["Nom", "Type", "Statut", "Entité", "Surface", "Acq.", "Valeur marché"],
    d.assets.map((a) => [
      a.name,
      a.type,
      a.status,
      d.entityMap.get(a.legalEntityId) ?? "—",
      a.surfaceM2 ? `${a.surfaceM2} m²` : "—",
      a.acquisitionPrice ? formatCurrency(a.acquisitionPrice) : "—",
      a.currentMarketValue ? formatCurrency(a.currentMarketValue) : "—",
    ]),
    { colWidths: [95, 60, 55, 80, 45, 80, 80] },
  );

  sectionTitle(doc, `Baux actifs (${activeLeases.length})`);
  table(
    doc,
    ["Référence", "Actif", "Locataire", "Type", "Loyer/mois", "Échéance"],
    activeLeases.map((l) => [
      l.reference,
      d.assetMap.get(l.assetId) ?? "—",
      d.tenantMap.get(l.tenantId) ?? "—",
      l.type,
      formatCurrency(l.baseRent),
      formatDate(l.endDate),
    ]),
    { colWidths: [75, 90, 90, 75, 80, 85] },
  );

  sectionTitle(doc, `Emprunts (${d.loans.length})`);
  table(
    doc,
    ["Référence", "Banque", "Capital initial", "Taux", "Mensualité", "Restant dû"],
    d.loans.map((loan) => {
      const out =
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
      return [
        loan.reference,
        loan.bank,
        formatCurrency(loan.initialAmount),
        `${loan.interestRate}%`,
        formatCurrency(loan.monthlyPayment),
        formatCurrency(out),
      ];
    }),
    { colWidths: [80, 80, 85, 45, 82, 123] },
  );

  addPageFooter(doc);
  doc.end();
  return p;
}

export async function buildAssetPdf(d: AssetReportData): Promise<Buffer> {
  const doc = makePdf();
  const p = collectBuffer(doc);

  const activeLeases = d.assetLeases.filter((l) => l.status === "Actif");
  const monthlyRent = activeLeases.reduce((s, l) => s + l.baseRent + (l.charges ?? 0), 0);
  const totalDebt = d.assetLoans.reduce((s, loan) => {
    const out =
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
    return s + out;
  }, 0);
  const netYield =
    d.asset.currentMarketValue && monthlyRent > 0
      ? (((monthlyRent * 12) / d.asset.currentMarketValue) * 100).toFixed(2) + "%"
      : "—";
  const annualDebt = d.assetLoans.reduce((s, l) => s + l.monthlyPayment * 12, 0);
  const dscr = annualDebt > 0 ? (monthlyRent * 12) / annualDebt : null;

  title(doc, `Fiche actif — ${d.asset.name}`, `${d.asset.address} · ${d.generatedAt}`);

  kpis(doc, [
    { label: "Type", value: d.asset.type },
    { label: "Statut", value: d.asset.status },
    { label: "Surface", value: d.asset.surfaceM2 ? `${d.asset.surfaceM2} m²` : "—" },
    { label: "DPE", value: d.asset.dpe ?? "—" },
    {
      label: "Prix d'acquisition",
      value: d.asset.acquisitionPrice ? formatCurrency(d.asset.acquisitionPrice) : "—",
    },
    {
      label: "Valeur de marché",
      value: d.asset.currentMarketValue ? formatCurrency(d.asset.currentMarketValue) : "—",
    },
    { label: "Loyer mensuel", value: formatCurrency(monthlyRent) },
    { label: "Rendement net", value: netYield },
  ]);

  if (dscr !== null && dscr < 1) {
    const alertY = doc.y;
    doc.rect(PAGE.left, alertY, PAGE.width, 22).fillAndStroke("#FEF2F2", "#FECACA");
    doc
      .fontSize(8)
      .fillColor(C.red)
      .font("Helvetica-Bold")
      .text(
        `Alerte DSCR : ${dscr.toFixed(2)} — Les revenus locatifs ne couvrent pas le service de la dette.`,
        PAGE.left + 8,
        alertY + 6,
        { width: PAGE.width - 16 },
      );
    doc.moveDown(0.8);
  }

  sectionTitle(doc, "Informations");
  const infoRows: [string, string][] = [
    ["Entité juridique", `${d.entity?.name ?? "—"} (${d.entity?.type ?? "—"})`],
    ["Régime fiscal", d.entity?.taxRegime ?? "—"],
    ["Détention", d.asset.ownershipPercent ? `${d.asset.ownershipPercent}%` : "—"],
    ["Date d'acquisition", d.asset.acquisitionDate ? formatDate(d.asset.acquisitionDate) : "—"],
    ["DSCR", dscr !== null ? dscr.toFixed(2) : "—"],
    ["Capital restant dû", totalDebt > 0 ? formatCurrency(totalDebt) : "—"],
  ];
  table(doc, ["Champ", "Valeur"], infoRows, { colWidths: [160, 335] });

  sectionTitle(doc, `Baux (${d.assetLeases.length})`);
  table(
    doc,
    ["Référence", "Locataire", "Type", "Statut", "Loyer", "Période"],
    d.assetLeases.map((l) => [
      l.reference,
      d.tenantMap.get(l.tenantId) ?? "—",
      l.type,
      l.status,
      `${formatCurrency(l.baseRent)}/mois`,
      `${formatDate(l.startDate)} – ${formatDate(l.endDate)}`,
    ]),
    { colWidths: [72, 85, 72, 55, 72, 139] },
  );

  sectionTitle(doc, `Emprunts (${d.assetLoans.length})`);
  table(
    doc,
    ["Référence", "Banque", "Capital initial", "Taux", "Mensualité", "Restant dû"],
    d.assetLoans.map((loan) => {
      const out =
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
      return [
        loan.reference,
        loan.bank,
        formatCurrency(loan.initialAmount),
        `${loan.interestRate}%`,
        formatCurrency(loan.monthlyPayment),
        formatCurrency(out),
      ];
    }),
    { colWidths: [80, 80, 85, 45, 82, 123] },
  );

  if (d.asset.notes) {
    sectionTitle(doc, "Notes");
    doc.fontSize(8).fillColor(C.dark).font("Helvetica").text(d.asset.notes, PAGE.left, doc.y, {
      width: PAGE.width,
    });
  }

  addPageFooter(doc);
  doc.end();
  return p;
}

export async function buildCashFlowPdf(d: CashFlowReportData): Promise<Buffer> {
  const doc = makePdf();
  const p = collectBuffer(doc);

  const txIn = d.transactions
    .filter((t) => t.direction === "Encaissement")
    .reduce((s, t) => s + t.amount, 0);
  const txOut = d.transactions
    .filter((t) => t.direction === "Décaissement")
    .reduce((s, t) => s + t.amount, 0);
  const net = txIn - txOut;

  title(
    doc,
    "Tableau de flux",
    `Période : ${formatDate(d.dateFrom)} – ${formatDate(d.dateTo)} · ${d.generatedAt}`,
  );

  kpis(doc, [
    { label: "Encaissements", value: formatCurrency(txIn) },
    { label: "Décaissements", value: formatCurrency(txOut) },
    { label: "Net", value: (net >= 0 ? "+" : "") + formatCurrency(net) },
    { label: "Transactions", value: d.transactions.length.toString() },
  ]);

  sectionTitle(doc, `Transactions (${d.transactions.length})`);
  table(
    doc,
    ["Date", "Libellé", "Type", "Actif", "Montant", "Réconcilié"],
    d.transactions.map((tx) => [
      formatDate(tx.date),
      tx.label,
      tx.type,
      d.assetMap.get(tx.assetId ?? "") ?? "—",
      (tx.direction === "Encaissement" ? "+" : "-") + formatCurrency(tx.amount),
      tx.reconciled ? "Oui" : "Non",
    ]),
    { colWidths: [65, 120, 75, 80, 95, 60] },
  );

  addPageFooter(doc);
  doc.end();
  return p;
}

export async function buildFiscalPdf(d: FiscalReportData): Promise<Buffer> {
  const doc = makePdf();
  const p = collectBuffer(doc);

  const totalRevenues = d.transactions
    .filter((t) => t.direction === "Encaissement")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = d.transactions
    .filter((t) => t.direction === "Décaissement")
    .reduce((s, t) => s + t.amount, 0);

  title(doc, `Synthèse fiscale ${d.year}`, `Généré le ${d.generatedAt}`);

  kpis(doc, [
    { label: "Revenus bruts", value: formatCurrency(totalRevenues) },
    { label: "Charges", value: formatCurrency(totalExpenses) },
    { label: "Résultat net", value: formatCurrency(totalRevenues - totalExpenses) },
    { label: "Entités", value: d.entities.length.toString() },
  ]);

  sectionTitle(doc, "Détail par entité juridique");
  table(
    doc,
    ["Entité", "Type", "Régime", "Encaissements", "Décaissements", "Net"],
    d.entities.map((entity) => {
      const entityTx = d.transactions.filter((t) => t.legalEntityId === entity.id);
      const rev = entityTx
        .filter((t) => t.direction === "Encaissement")
        .reduce((s, t) => s + t.amount, 0);
      const exp = entityTx
        .filter((t) => t.direction === "Décaissement")
        .reduce((s, t) => s + t.amount, 0);
      return [
        entity.name,
        entity.type,
        entity.taxRegime ?? "—",
        formatCurrency(rev),
        formatCurrency(exp),
        (rev - exp >= 0 ? "+" : "") + formatCurrency(rev - exp),
      ];
    }),
    { colWidths: [100, 55, 60, 80, 80, 120] },
  );

  addPageFooter(doc);
  doc.end();
  return p;
}

export async function buildLoanPlanPdf(d: LoanPlanData): Promise<Buffer> {
  const doc = makePdf();
  const p = collectBuffer(doc);

  const today = new Date().toISOString().slice(0, 10);
  const currentIdx = d.schedule.findLastIndex((l) => l.periodDate <= today);
  const currentLine = currentIdx >= 0 ? d.schedule[currentIdx] : d.schedule[0];
  const totalInterest = d.schedule.reduce((s, l) => s + l.interestPayment, 0);
  const totalInsurance = d.schedule.reduce((s, l) => s + (l.insurancePayment ?? 0), 0);

  title(
    doc,
    `Plan de financement — ${d.loan.reference}`,
    `${d.loan.bank} · ${d.asset?.name ?? "—"} · ${d.generatedAt}${d.loan.parsed ? " · Tableau parsé" : ""}`,
  );

  kpis(doc, [
    { label: "Capital initial", value: formatCurrency(d.loan.initialAmount) },
    { label: "Taux d'intérêt", value: `${d.loan.interestRate}%` },
    { label: "Mensualité", value: formatCurrency(d.loan.monthlyPayment) },
    {
      label: "Capital restant",
      value: currentLine ? formatCurrency(currentLine.remainingCapital) : "—",
    },
    { label: "Coût total intérêts", value: formatCurrency(totalInterest) },
    { label: "Coût assurance", value: totalInsurance > 0 ? formatCurrency(totalInsurance) : "—" },
    { label: "Durée", value: `${d.schedule.length} mois` },
    { label: "Fin", value: formatDate(d.loan.endDate) },
  ]);

  sectionTitle(doc, `Tableau d'amortissement (${d.schedule.length} lignes)`);
  table(
    doc,
    ["Période", "Capital", "Intérêts", "Assurance", "Total", "Restant dû"],
    d.schedule.map((line) => [
      formatDate(line.periodDate),
      formatCurrency(line.capitalPayment),
      formatCurrency(line.interestPayment),
      line.insurancePayment ? formatCurrency(line.insurancePayment) : "—",
      formatCurrency(line.totalPayment),
      formatCurrency(line.remainingCapital),
    ]),
    { colWidths: [72, 80, 80, 70, 80, 113] },
  );

  addPageFooter(doc);
  doc.end();
  return p;
}

export async function buildTenantReportPdf(d: TenantReportData): Promise<Buffer> {
  const doc = makePdf();
  const p = collectBuffer(doc);

  const txIn = d.transactions
    .filter((t) => t.direction === "Encaissement")
    .reduce((s, t) => s + t.amount, 0);

  title(
    doc,
    `Rapport locataire — ${d.tenant?.name ?? d.lease.reference}`,
    `Bail ${d.lease.reference} · ${d.asset?.name ?? "—"} · ${d.generatedAt}`,
  );

  kpis(doc, [
    { label: "Type locataire", value: d.tenant?.type ?? "—" },
    { label: "Score paiement", value: d.tenant?.paymentScore ?? "—" },
    { label: "Loyer mensuel", value: formatCurrency(d.lease.baseRent) },
    { label: "Statut bail", value: d.lease.status },
  ]);

  sectionTitle(doc, "Informations locataire");
  table(
    doc,
    ["Champ", "Valeur"],
    [
      ["Email", d.tenant?.email ?? "—"],
      ["Téléphone", d.tenant?.phone ?? "—"],
      ["SIRET", d.tenant?.siret ?? "—"],
      ["Garant", d.tenant?.guarantorName ?? "—"],
    ],
    { colWidths: [160, 335] },
  );

  sectionTitle(doc, "Détails du bail");
  table(
    doc,
    ["Champ", "Valeur"],
    [
      ["Référence", d.lease.reference],
      ["Type", d.lease.type],
      ["Début", formatDate(d.lease.startDate)],
      ["Fin", formatDate(d.lease.endDate)],
      ["Loyer base", `${formatCurrency(d.lease.baseRent)}/mois`],
      ["Charges", d.lease.charges ? `${formatCurrency(d.lease.charges)}/mois` : "—"],
      ["TVA", d.lease.tvaApplicable ? "Oui" : "Non"],
      ["Indexation", d.lease.indexationIndex ?? "—"],
    ],
    { colWidths: [160, 335] },
  );

  sectionTitle(
    doc,
    `Historique de paiement (${d.transactions.length} transactions · Total encaissé : ${formatCurrency(txIn)})`,
  );
  table(
    doc,
    ["Date", "Libellé", "Type", "Montant", "Réconcilié"],
    d.transactions.map((tx) => [
      formatDate(tx.date),
      tx.label,
      tx.type,
      (tx.direction === "Encaissement" ? "+" : "-") + formatCurrency(tx.amount),
      tx.reconciled ? "Oui" : "Non",
    ]),
    { colWidths: [65, 150, 90, 110, 80] },
  );

  addPageFooter(doc);
  doc.end();
  return p;
}
