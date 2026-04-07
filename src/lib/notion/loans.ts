import {
  notion,
  requireDbId,
  extractTitle,
  extractRichText,
  extractNumber,
  extractDate,
  extractCheckbox,
  extractRelationId,
} from "./client";
import type { Loan } from "@/types";
import { isDemoMode } from "@/lib/demo";
import * as demo from "@/lib/demo/data";

type NotionPage = { id: string; properties: Record<string, unknown> };

function pageToLoan(page: NotionPage): Loan {
  return {
    id: page.id,
    notionId: page.id,
    reference: extractTitle(page),
    assetId: extractRelationId(page, "Asset") ?? "",
    legalEntityId: extractRelationId(page, "Legal Entity") ?? "",
    bank: extractRichText(page, "Bank"),
    initialAmount: extractNumber(page, "Initial Amount €") ?? 0,
    interestRate: extractNumber(page, "Interest Rate %") ?? 0,
    startDate: extractDate(page, "Start Date") ?? "",
    endDate: extractDate(page, "End Date") ?? "",
    monthlyPayment: extractNumber(page, "Monthly Payment €") ?? 0,
    outstandingCapital: extractNumber(page, "Outstanding Capital €") ?? undefined,
    parsed: extractCheckbox(page, "Parsed"),
    notes: extractRichText(page, "Notes") || undefined,
    workspaceId: extractRichText(page, "Workspace ID"),
  };
}

export async function createLoan(data: {
  reference: string;
  assetId: string;
  legalEntityId: string;
  bank: string;
  initialAmount: number;
  interestRate: number;
  startDate: string;
  endDate: string;
  monthlyPayment: number;
  workspaceId: string;
  outstandingCapital?: number;
  notes?: string;
}): Promise<Loan> {
  if (isDemoMode()) {
    return {
      id: `demo-loan-new-${Date.now()}`,
      reference: data.reference,
      assetId: data.assetId,
      legalEntityId: data.legalEntityId,
      bank: data.bank,
      initialAmount: data.initialAmount,
      interestRate: data.interestRate,
      startDate: data.startDate,
      endDate: data.endDate,
      monthlyPayment: data.monthlyPayment,
      outstandingCapital: data.outstandingCapital,
      notes: data.notes,
      workspaceId: data.workspaceId,
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: requireDbId("LOANS") },
    properties: {
      Reference: { title: [{ text: { content: data.reference } }] },
      Asset: { relation: [{ id: data.assetId }] },
      "Legal Entity": { relation: [{ id: data.legalEntityId }] },
      Bank: { rich_text: [{ text: { content: data.bank } }] },
      "Initial Amount €": { number: data.initialAmount },
      "Interest Rate %": { number: data.interestRate },
      "Start Date": { date: { start: data.startDate } },
      "End Date": { date: { start: data.endDate } },
      "Monthly Payment €": { number: data.monthlyPayment },
      "Workspace ID": { rich_text: [{ text: { content: data.workspaceId } }] },
      Parsed: { checkbox: false },
      ...(data.outstandingCapital !== undefined && {
        "Outstanding Capital €": { number: data.outstandingCapital },
      }),
      ...(data.notes && { Notes: { rich_text: [{ text: { content: data.notes } }] } }),
    },
  });
  return pageToLoan(page as NotionPage);
}

export async function getLoanById(id: string): Promise<Loan | null> {
  if (isDemoMode()) return demo.LOANS.find((l) => l.id === id) ?? null;

  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return pageToLoan(page as NotionPage);
  } catch {
    return null;
  }
}

export async function listLoans(workspaceId: string): Promise<Loan[]> {
  if (isDemoMode()) return demo.LOANS.filter((l) => l.workspaceId === workspaceId);

  const response = await notion.databases.query({
    database_id: requireDbId("LOANS"),
    filter: { property: "Workspace ID", rich_text: { equals: workspaceId } },
    sorts: [{ property: "Reference", direction: "ascending" }],
  });
  return response.results.map((p) => pageToLoan(p as NotionPage));
}

export async function listLoansByAsset(assetId: string): Promise<Loan[]> {
  if (isDemoMode()) return demo.LOANS.filter((l) => l.assetId === assetId);

  const response = await notion.databases.query({
    database_id: requireDbId("LOANS"),
    filter: { property: "Asset", relation: { contains: assetId } },
  });
  return response.results.map((p) => pageToLoan(p as NotionPage));
}

export async function updateLoan(
  id: string,
  data: Partial<{
    reference: string;
    bank: string;
    initialAmount: number;
    interestRate: number;
    startDate: string;
    endDate: string;
    monthlyPayment: number;
    outstandingCapital: number;
    parsed: boolean;
    notes: string;
  }>,
): Promise<void> {
  if (isDemoMode()) return;

  await notion.pages.update({
    page_id: id,
    properties: {
      ...(data.reference && { Reference: { title: [{ text: { content: data.reference } }] } }),
      ...(data.bank !== undefined && { Bank: { rich_text: [{ text: { content: data.bank } }] } }),
      ...(data.initialAmount !== undefined && {
        "Initial Amount €": { number: data.initialAmount },
      }),
      ...(data.interestRate !== undefined && { "Interest Rate %": { number: data.interestRate } }),
      ...(data.startDate && { "Start Date": { date: { start: data.startDate } } }),
      ...(data.endDate && { "End Date": { date: { start: data.endDate } } }),
      ...(data.monthlyPayment !== undefined && {
        "Monthly Payment €": { number: data.monthlyPayment },
      }),
      ...(data.outstandingCapital !== undefined && {
        "Outstanding Capital €": { number: data.outstandingCapital },
      }),
      ...(data.parsed !== undefined && { Parsed: { checkbox: data.parsed } }),
      ...(data.notes !== undefined && {
        Notes: { rich_text: [{ text: { content: data.notes } }] },
      }),
    },
  });
}

export async function deleteLoan(id: string): Promise<void> {
  if (isDemoMode()) return;
  await notion.pages.update({ page_id: id, archived: true });
}

export function calculateDSCR(annualRent: number, annualDebtService: number): number {
  if (annualDebtService === 0) return Infinity;
  return annualRent / annualDebtService;
}
