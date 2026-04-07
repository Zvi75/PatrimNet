import ExcelJS from "exceljs";
import { formatDate } from "@/lib/utils";
import { generateAmortizationSchedule, estimateOutstandingCapital } from "@/lib/amortization";
import type {
  PortfolioReportData,
  AssetReportData,
  CashFlowReportData,
  FiscalReportData,
  LoanPlanData,
  TenantReportData,
} from "./data";

const BRAND = "1E40AF";
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEFF6FF" },
};
const TITLE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E40AF" },
};

function addTitle(ws: ExcelJS.Worksheet, title: string, subtitle: string, cols: number) {
  ws.mergeCells(1, 1, 1, cols);
  const titleCell = ws.getCell("A1");
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.fill = TITLE_FILL;
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, cols);
  ws.getCell("A2").value = subtitle;
  ws.getCell("A2").font = { size: 9, color: { argb: "FF94A3B8" } };
  ws.getRow(2).height = 18;
}

function addHeaders(ws: ExcelJS.Worksheet, row: number, headers: string[]) {
  const r = ws.getRow(row);
  headers.forEach((h, i) => {
    const cell = r.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: "FF475569" } };
    cell.fill = HEADER_FILL;
    cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
  });
  r.height = 20;
}

function styleDataRow(ws: ExcelJS.Worksheet, rowNum: number, cols: number) {
  for (let c = 1; c <= cols; c++) {
    ws.getCell(rowNum, c).font = { size: 9 };
    ws.getCell(rowNum, c).border = { bottom: { style: "hair", color: { argb: "FFF1F5F9" } } };
  }
}

function currencyFmt(cell: ExcelJS.Cell) {
  cell.numFmt = "#,##0.00 €";
}
function pctFmt(cell: ExcelJS.Cell) {
  cell.numFmt = "0.00%";
}

export async function buildPortfolioXlsx(d: PortfolioReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PatrimNet";
  wb.created = new Date();

  // — Assets sheet —
  const wsAssets = wb.addWorksheet("Actifs");
  wsAssets.columns = [
    { width: 28 },
    { width: 14 },
    { width: 14 },
    { width: 22 },
    { width: 10 },
    { width: 16 },
    { width: 16 },
    { width: 10 },
    { width: 12 },
    { width: 18 },
  ];
  addTitle(wsAssets, "Actifs immobiliers", `Généré le ${d.generatedAt}`, 10);
  addHeaders(wsAssets, 3, [
    "Nom",
    "Type",
    "Statut",
    "Entité",
    "Surface m²",
    "Prix acq. €",
    "Valeur marché €",
    "DPE",
    "Détention %",
    "Date acq.",
  ]);
  d.assets.forEach((a, i) => {
    const r = wsAssets.getRow(4 + i);
    r.values = [
      "",
      a.name,
      a.type,
      a.status,
      d.entityMap.get(a.legalEntityId) ?? "—",
      a.surfaceM2 ?? "",
      a.acquisitionPrice ?? "",
      a.currentMarketValue ?? "",
      a.dpe ?? "",
      a.ownershipPercent ?? "",
      a.acquisitionDate ?? "",
    ];
    // shift: ExcelJS uses 1-based
    r.getCell(1).value = a.name;
    r.getCell(2).value = a.type;
    r.getCell(3).value = a.status;
    r.getCell(4).value = d.entityMap.get(a.legalEntityId) ?? "—";
    r.getCell(5).value = a.surfaceM2 ?? null;
    r.getCell(6).value = a.acquisitionPrice ?? null;
    r.getCell(7).value = a.currentMarketValue ?? null;
    r.getCell(8).value = a.dpe ?? "";
    r.getCell(9).value = a.ownershipPercent ?? null;
    r.getCell(10).value = a.acquisitionDate ? new Date(a.acquisitionDate) : null;
    if (a.acquisitionPrice) currencyFmt(r.getCell(6));
    if (a.currentMarketValue) currencyFmt(r.getCell(7));
    if (a.ownershipPercent) r.getCell(9).numFmt = '0.00"%"';
    styleDataRow(wsAssets, 4 + i, 10);
  });

  // — Leases sheet —
  const wsLeases = wb.addWorksheet("Baux");
  wsLeases.columns = [
    { width: 20 },
    { width: 24 },
    { width: 22 },
    { width: 18 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];
  addTitle(wsLeases, "Baux", `Généré le ${d.generatedAt}`, 8);
  addHeaders(wsLeases, 3, [
    "Référence",
    "Actif",
    "Locataire",
    "Type",
    "Statut",
    "Loyer base €",
    "Charges €",
    "Échéance",
  ]);
  d.leases.forEach((l, i) => {
    const r = wsLeases.getRow(4 + i);
    r.getCell(1).value = l.reference;
    r.getCell(2).value = d.assetMap.get(l.assetId) ?? "—";
    r.getCell(3).value = d.tenantMap.get(l.tenantId) ?? "—";
    r.getCell(4).value = l.type;
    r.getCell(5).value = l.status;
    r.getCell(6).value = l.baseRent;
    r.getCell(7).value = l.charges ?? null;
    r.getCell(8).value = l.endDate ? new Date(l.endDate) : null;
    currencyFmt(r.getCell(6));
    if (l.charges) currencyFmt(r.getCell(7));
    styleDataRow(wsLeases, 4 + i, 8);
  });

  // — Loans sheet —
  const wsLoans = wb.addWorksheet("Emprunts");
  wsLoans.columns = [
    { width: 22 },
    { width: 22 },
    { width: 18 },
    { width: 14 },
    { width: 8 },
    { width: 14 },
    { width: 16 },
    { width: 12 },
  ];
  addTitle(wsLoans, "Emprunts", `Généré le ${d.generatedAt}`, 8);
  addHeaders(wsLoans, 3, [
    "Référence",
    "Actif",
    "Banque",
    "Capital initial €",
    "Taux %",
    "Mensualité €",
    "Restant dû €",
    "Fin",
  ]);
  d.loans.forEach((loan, i) => {
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
    const r = wsLoans.getRow(4 + i);
    r.getCell(1).value = loan.reference;
    r.getCell(2).value = d.assetMap.get(loan.assetId) ?? "—";
    r.getCell(3).value = loan.bank;
    r.getCell(4).value = loan.initialAmount;
    r.getCell(5).value = loan.interestRate / 100;
    r.getCell(6).value = loan.monthlyPayment;
    r.getCell(7).value = outstanding;
    r.getCell(8).value = loan.endDate ? new Date(loan.endDate) : null;
    currencyFmt(r.getCell(4));
    pctFmt(r.getCell(5));
    currencyFmt(r.getCell(6));
    currencyFmt(r.getCell(7));
    styleDataRow(wsLoans, 4 + i, 8);
  });

  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

export async function buildAssetXlsx(d: AssetReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PatrimNet";

  // — Summary sheet —
  const wsSummary = wb.addWorksheet("Résumé");
  wsSummary.columns = [{ width: 22 }, { width: 28 }];
  addTitle(wsSummary, `Fiche actif — ${d.asset.name}`, d.generatedAt, 2);
  const fields = [
    ["Type", d.asset.type],
    ["Statut", d.asset.status],
    ["Surface", d.asset.surfaceM2 ? `${d.asset.surfaceM2} m²` : "—"],
    ["Entité juridique", d.entity?.name ?? "—"],
    ["Régime fiscal", d.entity?.taxRegime ?? "—"],
    ["DPE", d.asset.dpe ?? "—"],
    ["Date d'acquisition", d.asset.acquisitionDate ?? "—"],
    ["Prix d'acquisition", d.asset.acquisitionPrice ? `${d.asset.acquisitionPrice} €` : "—"],
    ["Valeur de marché", d.asset.currentMarketValue ? `${d.asset.currentMarketValue} €` : "—"],
    ["Détention", d.asset.ownershipPercent ? `${d.asset.ownershipPercent}%` : "—"],
  ];
  fields.forEach(([k, v], i) => {
    wsSummary.getCell(4 + i, 1).value = k;
    wsSummary.getCell(4 + i, 1).font = { bold: true, size: 9 };
    wsSummary.getCell(4 + i, 2).value = v;
    wsSummary.getCell(4 + i, 2).font = { size: 9 };
  });

  // — Leases sheet —
  const wsLeases = wb.addWorksheet("Baux");
  wsLeases.columns = [
    { width: 20 },
    { width: 20 },
    { width: 16 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];
  addTitle(wsLeases, "Baux", `${d.asset.name} · ${d.generatedAt}`, 7);
  addHeaders(wsLeases, 3, [
    "Référence",
    "Locataire",
    "Type",
    "Statut",
    "Loyer €",
    "Charges €",
    "Fin",
  ]);
  d.assetLeases.forEach((l, i) => {
    const r = wsLeases.getRow(4 + i);
    r.getCell(1).value = l.reference;
    r.getCell(2).value = d.tenantMap.get(l.tenantId) ?? "—";
    r.getCell(3).value = l.type;
    r.getCell(4).value = l.status;
    r.getCell(5).value = l.baseRent;
    r.getCell(6).value = l.charges ?? null;
    r.getCell(7).value = l.endDate ? new Date(l.endDate) : null;
    currencyFmt(r.getCell(5));
    if (l.charges) currencyFmt(r.getCell(6));
  });

  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

export async function buildCashFlowXlsx(d: CashFlowReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PatrimNet";

  const ws = wb.addWorksheet("Flux de trésorerie");
  ws.columns = [
    { width: 12 },
    { width: 36 },
    { width: 18 },
    { width: 22 },
    { width: 16 },
    { width: 14 },
    { width: 12 },
  ];
  addTitle(
    ws,
    "Flux de trésorerie",
    `${formatDate(d.dateFrom)} → ${formatDate(d.dateTo)} · ${d.generatedAt}`,
    7,
  );
  addHeaders(ws, 3, ["Date", "Libellé", "Type", "Actif", "Montant €", "Sens", "Réconcilié"]);
  d.transactions.forEach((tx, i) => {
    const r = ws.getRow(4 + i);
    r.getCell(1).value = tx.date ? new Date(tx.date) : null;
    r.getCell(2).value = tx.label;
    r.getCell(3).value = tx.type;
    r.getCell(4).value = d.assetMap.get(tx.assetId ?? "") ?? "—";
    r.getCell(5).value = tx.direction === "Encaissement" ? tx.amount : -tx.amount;
    r.getCell(6).value = tx.direction;
    r.getCell(7).value = tx.reconciled ? "Oui" : "Non";
    currencyFmt(r.getCell(5));
    r.getCell(5).font = {
      size: 9,
      color: { argb: tx.direction === "Encaissement" ? "FF16A34A" : "FFDC2626" },
    };
    styleDataRow(ws, 4 + i, 7);
  });

  // Summary at bottom
  const lastRow = 4 + d.transactions.length + 1;
  ws.getCell(lastRow, 4).value = "Total encaissements";
  ws.getCell(lastRow, 4).font = { bold: true, size: 9 };
  ws.getCell(lastRow, 5).value = d.transactions
    .filter((t) => t.direction === "Encaissement")
    .reduce((s, t) => s + t.amount, 0);
  currencyFmt(ws.getCell(lastRow, 5));
  ws.getCell(lastRow + 1, 4).value = "Total décaissements";
  ws.getCell(lastRow + 1, 4).font = { bold: true, size: 9 };
  ws.getCell(lastRow + 1, 5).value = -d.transactions
    .filter((t) => t.direction === "Décaissement")
    .reduce((s, t) => s + t.amount, 0);
  currencyFmt(ws.getCell(lastRow + 1, 5));

  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

export async function buildFiscalXlsx(d: FiscalReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PatrimNet";

  const ws = wb.addWorksheet(`Synthèse ${d.year}`);
  ws.columns = [
    { width: 22 },
    { width: 12 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];
  addTitle(ws, `Synthèse fiscale ${d.year}`, `Généré le ${d.generatedAt}`, 6);
  addHeaders(ws, 3, [
    "Entité",
    "Type",
    "Régime fiscal",
    "Encaissements €",
    "Décaissements €",
    "Résultat net €",
  ]);
  d.entities.forEach((entity, i) => {
    const entityTx = d.transactions.filter((t) => t.legalEntityId === entity.id);
    const rev = entityTx
      .filter((t) => t.direction === "Encaissement")
      .reduce((s, t) => s + t.amount, 0);
    const exp = entityTx
      .filter((t) => t.direction === "Décaissement")
      .reduce((s, t) => s + t.amount, 0);
    const r = ws.getRow(4 + i);
    r.getCell(1).value = entity.name;
    r.getCell(2).value = entity.type;
    r.getCell(3).value = entity.taxRegime ?? "—";
    r.getCell(4).value = rev;
    r.getCell(5).value = exp;
    r.getCell(6).value = rev - exp;
    currencyFmt(r.getCell(4));
    currencyFmt(r.getCell(5));
    currencyFmt(r.getCell(6));
    r.getCell(6).font = { size: 9, color: { argb: rev - exp >= 0 ? "FF16A34A" : "FFDC2626" } };
    styleDataRow(ws, 4 + i, 6);
  });

  const wsDetail = wb.addWorksheet("Transactions");
  wsDetail.columns = [
    { width: 12 },
    { width: 30 },
    { width: 18 },
    { width: 20 },
    { width: 14 },
    { width: 14 },
  ];
  addTitle(wsDetail, `Transactions ${d.year}`, `Généré le ${d.generatedAt}`, 6);
  addHeaders(wsDetail, 3, ["Date", "Libellé", "Type", "Entité", "Montant €", "Sens"]);
  d.transactions.forEach((tx, i) => {
    const r = wsDetail.getRow(4 + i);
    r.getCell(1).value = tx.date ? new Date(tx.date) : null;
    r.getCell(2).value = tx.label;
    r.getCell(3).value = tx.type;
    r.getCell(4).value = d.entityMap.get(tx.legalEntityId ?? "") ?? "—";
    r.getCell(5).value = tx.direction === "Encaissement" ? tx.amount : -tx.amount;
    r.getCell(6).value = tx.direction;
    currencyFmt(r.getCell(5));
  });

  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

export async function buildLoanPlanXlsx(d: LoanPlanData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PatrimNet";

  const ws = wb.addWorksheet("Amortissement");
  ws.columns = [
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
  ];
  addTitle(
    ws,
    `Plan de financement — ${d.loan.reference}`,
    `${d.loan.bank} · ${d.asset?.name ?? "—"} · ${d.generatedAt}`,
    6,
  );
  addHeaders(ws, 3, [
    "Période",
    "Capital €",
    "Intérêts €",
    "Assurance €",
    "Total €",
    "Restant dû €",
  ]);
  const today = new Date().toISOString().slice(0, 10);
  d.schedule.forEach((line, i) => {
    const r = ws.getRow(4 + i);
    const isCurrent =
      line.periodDate <= today &&
      (i === d.schedule.length - 1 || d.schedule[i + 1].periodDate > today);
    r.getCell(1).value = line.periodDate ? new Date(line.periodDate) : null;
    r.getCell(2).value = line.capitalPayment;
    r.getCell(3).value = line.interestPayment;
    r.getCell(4).value = line.insurancePayment ?? null;
    r.getCell(5).value = line.totalPayment;
    r.getCell(6).value = line.remainingCapital;
    [2, 3, 4, 5, 6].forEach((c) => {
      if (ws.getCell(4 + i, c).value) currencyFmt(ws.getCell(4 + i, c));
    });
    if (isCurrent) {
      for (let c = 1; c <= 6; c++) {
        ws.getCell(4 + i, c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEFF6FF" },
        };
        ws.getCell(4 + i, c).font = { bold: true, size: 9 };
      }
    } else {
      styleDataRow(ws, 4 + i, 6);
    }
  });

  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

export async function buildTenantReportXlsx(d: TenantReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PatrimNet";

  const ws = wb.addWorksheet("Rapport locataire");
  ws.columns = [{ width: 12 }, { width: 30 }, { width: 18 }, { width: 16 }, { width: 14 }];
  addTitle(
    ws,
    `Rapport locataire — ${d.tenant?.name ?? d.lease.reference}`,
    `${d.asset?.name ?? "—"} · ${d.generatedAt}`,
    5,
  );
  addHeaders(ws, 3, ["Date", "Libellé", "Type", "Montant €", "Réconcilié"]);
  d.transactions.forEach((tx, i) => {
    const r = ws.getRow(4 + i);
    r.getCell(1).value = tx.date ? new Date(tx.date) : null;
    r.getCell(2).value = tx.label;
    r.getCell(3).value = tx.type;
    r.getCell(4).value = tx.direction === "Encaissement" ? tx.amount : -tx.amount;
    r.getCell(5).value = tx.reconciled ? "Oui" : "Non";
    currencyFmt(r.getCell(4));
    r.getCell(4).font = {
      size: 9,
      color: { argb: tx.direction === "Encaissement" ? "FF16A34A" : "FFDC2626" },
    };
    styleDataRow(ws, 4 + i, 5);
  });

  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}
