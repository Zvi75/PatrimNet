import { listAssets, getAssetById } from "@/lib/notion/assets";
import { listLeases, listLeasesByAsset } from "@/lib/notion/leases";
import { listTenants, getTenantById } from "@/lib/notion/tenants";
import { listLoans, getLoanById } from "@/lib/notion/loans";
import { listLegalEntities } from "@/lib/notion/legal-entities";
import { listTransactions } from "@/lib/notion/transactions";
import { listAmortizationLines } from "@/lib/notion/amortization-lines";
import { generateAmortizationSchedule, estimateOutstandingCapital } from "@/lib/amortization";
import type {
  Asset,
  Lease,
  Tenant,
  Loan,
  LegalEntity,
  Transaction,
  AmortizationLine,
} from "@/types";

export interface PortfolioReportData {
  assets: Asset[];
  leases: Lease[];
  loans: Loan[];
  entities: LegalEntity[];
  tenants: Tenant[];
  assetMap: Map<string, string>;
  tenantMap: Map<string, string>;
  entityMap: Map<string, string>;
  generatedAt: string;
  workspaceId: string;
}

export interface AssetReportData extends PortfolioReportData {
  asset: Asset;
  assetLeases: Lease[];
  assetLoans: Loan[];
  entity: LegalEntity | undefined;
}

export interface CashFlowReportData {
  transactions: Transaction[];
  assets: Asset[];
  entities: LegalEntity[];
  assetMap: Map<string, string>;
  entityMap: Map<string, string>;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
}

export interface FiscalReportData {
  year: number;
  entities: LegalEntity[];
  assets: Asset[];
  leases: Lease[];
  transactions: Transaction[];
  assetMap: Map<string, string>;
  entityMap: Map<string, string>;
  generatedAt: string;
}

export interface LoanPlanData {
  loan: Loan;
  asset: Asset | null;
  entity: LegalEntity | undefined;
  schedule: Omit<AmortizationLine, "id" | "notionId">[];
  generatedAt: string;
}

export interface TenantReportData {
  lease: Lease;
  tenant: Tenant | null;
  asset: Asset | null;
  transactions: Transaction[];
  generatedAt: string;
}

export async function buildPortfolioReportData(workspaceId: string): Promise<PortfolioReportData> {
  const [assets, leases, loans, entities, tenants] = await Promise.all([
    listAssets(workspaceId),
    listLeases(workspaceId),
    listLoans(workspaceId),
    listLegalEntities(workspaceId),
    listTenants(workspaceId),
  ]);
  return {
    assets,
    leases,
    loans,
    entities,
    tenants,
    assetMap: new Map(assets.map((a) => [a.id, a.name])),
    tenantMap: new Map(tenants.map((t) => [t.id, t.name])),
    entityMap: new Map(entities.map((e) => [e.id, e.name])),
    generatedAt: new Date().toLocaleDateString("fr-FR", { dateStyle: "long" }),
    workspaceId,
  };
}

export async function buildAssetReportData(
  workspaceId: string,
  assetId: string,
): Promise<AssetReportData> {
  const base = await buildPortfolioReportData(workspaceId);
  const asset = await getAssetById(assetId);
  if (!asset || asset.workspaceId !== workspaceId) throw new Error("Asset not found");
  const [assetLeases, assetLoans] = await Promise.all([
    listLeasesByAsset(assetId),
    Promise.resolve(base.loans.filter((l) => l.assetId === assetId)),
  ]);
  const entity = base.entities.find((e) => e.id === asset.legalEntityId);
  return { ...base, asset, assetLeases, assetLoans, entity };
}

export async function buildCashFlowData(
  workspaceId: string,
  dateFrom: string,
  dateTo: string,
): Promise<CashFlowReportData> {
  const [transactions, assets, entities] = await Promise.all([
    listTransactions(workspaceId, { dateFrom, dateTo }),
    listAssets(workspaceId),
    listLegalEntities(workspaceId),
  ]);
  return {
    transactions,
    assets,
    entities,
    assetMap: new Map(assets.map((a) => [a.id, a.name])),
    entityMap: new Map(entities.map((e) => [e.id, e.name])),
    dateFrom,
    dateTo,
    generatedAt: new Date().toLocaleDateString("fr-FR", { dateStyle: "long" }),
  };
}

export async function buildFiscalData(
  workspaceId: string,
  year: number,
): Promise<FiscalReportData> {
  const [assets, leases, entities, transactions] = await Promise.all([
    listAssets(workspaceId),
    listLeases(workspaceId),
    listLegalEntities(workspaceId),
    listTransactions(workspaceId, {
      dateFrom: `${year}-01-01`,
      dateTo: `${year}-12-31`,
    }),
  ]);
  return {
    year,
    entities,
    assets,
    leases,
    transactions,
    assetMap: new Map(assets.map((a) => [a.id, a.name])),
    entityMap: new Map(entities.map((e) => [e.id, e.name])),
    generatedAt: new Date().toLocaleDateString("fr-FR", { dateStyle: "long" }),
  };
}

export async function buildLoanPlanData(
  workspaceId: string,
  loanId: string,
): Promise<LoanPlanData> {
  const loan = await getLoanById(loanId);
  if (!loan || loan.workspaceId !== workspaceId) throw new Error("Loan not found");

  let schedule: Omit<AmortizationLine, "id" | "notionId">[];
  if (loan.parsed) {
    const stored = await listAmortizationLines(loanId);
    schedule = stored;
  } else {
    schedule = generateAmortizationSchedule({
      loanId,
      initialAmount: loan.initialAmount,
      annualInterestRate: loan.interestRate,
      monthlyPayment: loan.monthlyPayment,
      startDate: loan.startDate,
      endDate: loan.endDate,
    });
  }

  const [assets, entities] = await Promise.all([
    listAssets(workspaceId),
    listLegalEntities(workspaceId),
  ]);
  const asset = assets.find((a) => a.id === loan.assetId) ?? null;
  const entity = entities.find((e) => e.id === loan.legalEntityId);

  return {
    loan,
    asset,
    entity,
    schedule,
    generatedAt: new Date().toLocaleDateString("fr-FR", { dateStyle: "long" }),
  };
}

export async function buildTenantReportData(
  workspaceId: string,
  leaseId: string,
): Promise<TenantReportData> {
  const leases = await listLeases(workspaceId);
  const lease = leases.find((l) => l.id === leaseId);
  if (!lease) throw new Error("Lease not found");

  const [tenant, assets, transactions] = await Promise.all([
    lease.tenantId ? getTenantById(lease.tenantId) : Promise.resolve(null),
    listAssets(workspaceId),
    listTransactions(workspaceId),
  ]);
  const asset = assets.find((a) => a.id === lease.assetId) ?? null;
  const leaseTransactions = transactions.filter((t) => t.leaseId === leaseId);
  return {
    lease,
    tenant,
    asset,
    transactions: leaseTransactions,
    generatedAt: new Date().toLocaleDateString("fr-FR", { dateStyle: "long" }),
  };
}
