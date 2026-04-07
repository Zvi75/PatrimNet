import {
  notion,
  requireDbId,
  extractTitle,
  extractRichText,
  extractSelect,
  extractNumber,
  extractDate,
  extractCheckbox,
  extractRelationId,
} from "./client";
import type { Transaction, TransactionType, TransactionDirection } from "@/types";
import { isDemoMode } from "@/lib/demo";
import * as demo from "@/lib/demo/data";

type NotionPage = { id: string; properties: Record<string, unknown> };

function pageToTransaction(page: NotionPage): Transaction {
  return {
    id: page.id,
    notionId: page.id,
    label: extractTitle(page),
    assetId: extractRelationId(page, "Asset") ?? undefined,
    legalEntityId: extractRelationId(page, "Legal Entity") ?? undefined,
    leaseId: extractRelationId(page, "Lease") ?? undefined,
    loanId: extractRelationId(page, "Loan") ?? undefined,
    type: (extractSelect(page, "Type") as TransactionType) ?? "Autre",
    amount: extractNumber(page, "Amount €") ?? 0,
    direction: (extractSelect(page, "Direction") as TransactionDirection) ?? "Encaissement",
    date: extractDate(page, "Date") ?? "",
    reconciled: extractCheckbox(page, "Reconciled"),
    notes: extractRichText(page, "Notes") || undefined,
    workspaceId: extractRichText(page, "Workspace ID"),
  };
}

export async function createTransaction(data: {
  label: string;
  type: TransactionType;
  amount: number;
  direction: TransactionDirection;
  date: string;
  workspaceId: string;
  assetId?: string;
  legalEntityId?: string;
  leaseId?: string;
  loanId?: string;
  reconciled?: boolean;
  notes?: string;
}): Promise<Transaction> {
  if (isDemoMode()) {
    return {
      id: `demo-tx-new-${Date.now()}`,
      label: data.label,
      type: data.type,
      amount: data.amount,
      direction: data.direction,
      date: data.date,
      assetId: data.assetId,
      legalEntityId: data.legalEntityId,
      leaseId: data.leaseId,
      loanId: data.loanId,
      reconciled: data.reconciled ?? false,
      notes: data.notes,
      workspaceId: data.workspaceId,
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: requireDbId("TRANSACTIONS") },
    properties: {
      Label: { title: [{ text: { content: data.label } }] },
      Type: { select: { name: data.type } },
      "Amount €": { number: data.amount },
      Direction: { select: { name: data.direction } },
      Date: { date: { start: data.date } },
      "Workspace ID": { rich_text: [{ text: { content: data.workspaceId } }] },
      Reconciled: { checkbox: data.reconciled ?? false },
      ...(data.assetId && { Asset: { relation: [{ id: data.assetId }] } }),
      ...(data.legalEntityId && { "Legal Entity": { relation: [{ id: data.legalEntityId }] } }),
      ...(data.leaseId && { Lease: { relation: [{ id: data.leaseId }] } }),
      ...(data.loanId && { Loan: { relation: [{ id: data.loanId }] } }),
      ...(data.notes && { Notes: { rich_text: [{ text: { content: data.notes } }] } }),
    },
  });
  return pageToTransaction(page as NotionPage);
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  if (isDemoMode()) return demo.TRANSACTIONS.find((t) => t.id === id) ?? null;

  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return pageToTransaction(page as NotionPage);
  } catch {
    return null;
  }
}

export interface TransactionFilters {
  assetId?: string;
  legalEntityId?: string;
  type?: TransactionType;
  direction?: TransactionDirection;
  dateFrom?: string;
  dateTo?: string;
  reconciled?: boolean;
}

export async function listTransactions(
  workspaceId: string,
  filters?: TransactionFilters,
): Promise<Transaction[]> {
  if (isDemoMode()) {
    let txs = demo.TRANSACTIONS.filter((t) => t.workspaceId === workspaceId);
    if (filters?.assetId) txs = txs.filter((t) => t.assetId === filters.assetId);
    if (filters?.legalEntityId) txs = txs.filter((t) => t.legalEntityId === filters.legalEntityId);
    if (filters?.type) txs = txs.filter((t) => t.type === filters.type);
    if (filters?.direction) txs = txs.filter((t) => t.direction === filters.direction);
    if (filters?.reconciled !== undefined)
      txs = txs.filter((t) => t.reconciled === filters.reconciled);
    if (filters?.dateFrom) txs = txs.filter((t) => t.date >= filters.dateFrom!);
    if (filters?.dateTo) txs = txs.filter((t) => t.date <= filters.dateTo!);
    return txs.sort((a, b) => b.date.localeCompare(a.date));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterConditions: any[] = [
    { property: "Workspace ID", rich_text: { equals: workspaceId } },
  ];

  if (filters?.type) {
    filterConditions.push({ property: "Type", select: { equals: filters.type } });
  }
  if (filters?.direction) {
    filterConditions.push({ property: "Direction", select: { equals: filters.direction } });
  }
  if (filters?.reconciled !== undefined) {
    filterConditions.push({ property: "Reconciled", checkbox: { equals: filters.reconciled } });
  }
  if (filters?.assetId) {
    filterConditions.push({ property: "Asset", relation: { contains: filters.assetId } });
  }
  if (filters?.legalEntityId) {
    filterConditions.push({
      property: "Legal Entity",
      relation: { contains: filters.legalEntityId },
    });
  }
  if (filters?.dateFrom) {
    filterConditions.push({ property: "Date", date: { on_or_after: filters.dateFrom } });
  }
  if (filters?.dateTo) {
    filterConditions.push({ property: "Date", date: { on_or_before: filters.dateTo } });
  }

  const response = await notion.databases.query({
    database_id: requireDbId("TRANSACTIONS"),
    filter: filterConditions.length === 1 ? filterConditions[0] : { and: filterConditions },
    sorts: [{ property: "Date", direction: "descending" }],
  });

  return response.results.map((p) => pageToTransaction(p as NotionPage));
}

export async function updateTransaction(
  id: string,
  data: Partial<{
    label: string;
    type: TransactionType;
    amount: number;
    direction: TransactionDirection;
    date: string;
    reconciled: boolean;
    notes: string;
    assetId: string;
    legalEntityId: string;
    leaseId: string;
    loanId: string;
  }>,
): Promise<void> {
  if (isDemoMode()) return;

  await notion.pages.update({
    page_id: id,
    properties: {
      ...(data.label && { Label: { title: [{ text: { content: data.label } }] } }),
      ...(data.type && { Type: { select: { name: data.type } } }),
      ...(data.amount !== undefined && { "Amount €": { number: data.amount } }),
      ...(data.direction && { Direction: { select: { name: data.direction } } }),
      ...(data.date && { Date: { date: { start: data.date } } }),
      ...(data.reconciled !== undefined && { Reconciled: { checkbox: data.reconciled } }),
      ...(data.notes !== undefined && {
        Notes: { rich_text: [{ text: { content: data.notes } }] },
      }),
      ...(data.assetId && { Asset: { relation: [{ id: data.assetId }] } }),
      ...(data.legalEntityId && { "Legal Entity": { relation: [{ id: data.legalEntityId }] } }),
      ...(data.leaseId && { Lease: { relation: [{ id: data.leaseId }] } }),
      ...(data.loanId && { Loan: { relation: [{ id: data.loanId }] } }),
    },
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  if (isDemoMode()) return;
  await notion.pages.update({ page_id: id, archived: true });
}

export async function getMonthlyCashFlow(
  workspaceId: string,
  months = 6,
): Promise<Array<{ month: string; encaissements: number; decaissements: number }>> {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const txs = await listTransactions(workspaceId, {
    dateFrom: from.toISOString().slice(0, 10),
  });

  const buckets = new Map<string, { encaissements: number; decaissements: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const key = d.toLocaleDateString("fr-FR", { month: "short" });
    buckets.set(key, { encaissements: 0, decaissements: 0 });
  }

  for (const tx of txs) {
    const d = new Date(tx.date);
    const key = d.toLocaleDateString("fr-FR", { month: "short" });
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (tx.direction === "Encaissement") {
      bucket.encaissements += tx.amount;
    } else {
      bucket.decaissements += tx.amount;
    }
  }

  return Array.from(buckets.entries()).map(([month, v]) => ({ month, ...v }));
}
