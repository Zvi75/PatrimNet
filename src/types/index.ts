import type {
  ENTITY_TYPES,
  ASSET_TYPES,
  ASSET_STATUSES,
  DPE_RATINGS,
  LEASE_TYPES,
  LEASE_STATUSES,
  INDEXATION_INDEXES,
  TRANSACTION_TYPES,
  TRANSACTION_DIRECTIONS,
  TAX_REGIMES,
  TENANT_TYPES,
  PAYMENT_SCORES,
  DOCUMENT_TYPES,
  USER_ROLES,
  PLANS,
} from "@/lib/constants";

export type EntityType = (typeof ENTITY_TYPES)[number];
export type AssetType = (typeof ASSET_TYPES)[number];
export type AssetStatus = (typeof ASSET_STATUSES)[number];
export type DPERating = (typeof DPE_RATINGS)[number];
export type LeaseType = (typeof LEASE_TYPES)[number];
export type LeaseStatus = (typeof LEASE_STATUSES)[number];
export type IndexationIndex = (typeof INDEXATION_INDEXES)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TransactionDirection = (typeof TRANSACTION_DIRECTIONS)[number];
export type TaxRegime = (typeof TAX_REGIMES)[number];
export type TenantType = (typeof TENANT_TYPES)[number];
export type PaymentScore = (typeof PAYMENT_SCORES)[number];
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type PlanId = keyof typeof PLANS;

export interface User {
  id: string;
  notionId?: string;
  name: string;
  email: string;
  role: UserRole;
  workspaceId: string;
  clerkUserId: string;
  plan: PlanId;
  createdAt: string;
}

export interface Workspace {
  id: string;
  notionId?: string;
  name: string;
  ownerUserId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  plan: PlanId;
  active: boolean;
  createdAt: string;
  trialEndsAt?: string;
}

export interface LegalEntity {
  id: string;
  notionId?: string;
  name: string;
  type: EntityType;
  siren?: string;
  parentEntityId?: string;
  workspaceId: string;
  taxRegime?: TaxRegime;
  address?: string;
  notes?: string;
  children?: LegalEntity[];
}

export interface Asset {
  id: string;
  notionId?: string;
  name: string;
  address: string;
  type: AssetType;
  surfaceM2?: number;
  acquisitionDate?: string;
  acquisitionPrice?: number;
  currentMarketValue?: number;
  ownershipPercent?: number;
  legalEntityId: string;
  legalEntityName?: string;
  status: AssetStatus;
  dpe?: DPERating;
  notes?: string;
  workspaceId?: string;
}

export interface Lease {
  id: string;
  notionId?: string;
  reference: string;
  assetId: string;
  assetName?: string;
  tenantId: string;
  tenantName?: string;
  type: LeaseType;
  startDate: string;
  endDate: string;
  nextRevisionDate?: string;
  baseRent: number;
  charges?: number;
  tvaApplicable?: boolean;
  indexationIndex?: IndexationIndex;
  status: LeaseStatus;
  workspaceId?: string;
}

export interface Tenant {
  id: string;
  notionId?: string;
  name: string;
  type: TenantType;
  siret?: string;
  email?: string;
  phone?: string;
  guarantorName?: string;
  guarantorContact?: string;
  paymentScore?: PaymentScore;
  notes?: string;
}

export interface Transaction {
  id: string;
  notionId?: string;
  label: string;
  assetId?: string;
  assetName?: string;
  legalEntityId?: string;
  legalEntityName?: string;
  type: TransactionType;
  amount: number;
  direction: TransactionDirection;
  date: string;
  leaseId?: string;
  loanId?: string;
  reconciled?: boolean;
  notes?: string;
  workspaceId?: string;
}

export interface Loan {
  id: string;
  notionId?: string;
  reference: string;
  assetId: string;
  assetName?: string;
  legalEntityId: string;
  bank: string;
  initialAmount: number;
  interestRate: number;
  startDate: string;
  endDate: string;
  monthlyPayment: number;
  outstandingCapital?: number;
  parsed?: boolean;
  notes?: string;
  workspaceId?: string;
}

export interface AmortizationLine {
  id: string;
  notionId?: string;
  loanId: string;
  periodDate: string;
  capitalPayment: number;
  interestPayment: number;
  insurancePayment?: number;
  totalPayment: number;
  remainingCapital: number;
}

export interface Document {
  id: string;
  notionId?: string;
  name: string;
  assetId?: string;
  leaseId?: string;
  loanId?: string;
  type: DocumentType;
  fileUrl: string;
  uploadedAt: string;
  parsedByAI?: boolean;
  extractedData?: string;
  workspaceId?: string;
}

// Dashboard KPIs
export interface PortfolioKPIs {
  totalAssets: number;
  totalRentRoll: number;
  occupancyRate: number;
  totalMarketValue: number;
  totalOutstandingDebt: number;
  netYield: number;
}

// Report types
export type ReportType =
  | "fiche-actif"
  | "rapport-portefeuille"
  | "flux-mensuel"
  | "synthese-fiscale"
  | "plan-financement"
  | "rapport-locataire";

export interface ExportResult {
  pdfUrl: string;
  docxUrl: string;
  xlsxUrl: string;
}
