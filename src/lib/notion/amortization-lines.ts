import { notion, requireDbId, extractNumber, extractDate, extractRelationId } from "./client";
import type { AmortizationLine } from "@/types";

type NotionPage = { id: string; properties: Record<string, unknown> };

function getLineId(page: NotionPage): string {
  const prop = page.properties["ID"] as { title: Array<{ plain_text: string }> } | undefined;
  return prop?.title?.[0]?.plain_text ?? "";
}

function pageToLine(page: NotionPage): AmortizationLine {
  return {
    id: page.id,
    notionId: page.id,
    loanId: extractRelationId(page, "Loan") ?? "",
    periodDate: extractDate(page, "Period Date") ?? "",
    capitalPayment: extractNumber(page, "Capital Payment €") ?? 0,
    interestPayment: extractNumber(page, "Interest Payment €") ?? 0,
    insurancePayment: extractNumber(page, "Insurance Payment €") ?? undefined,
    totalPayment: extractNumber(page, "Total Payment €") ?? 0,
    remainingCapital: extractNumber(page, "Remaining Capital €") ?? 0,
  };
}

export async function createAmortizationLine(data: {
  loanId: string;
  periodDate: string;
  capitalPayment: number;
  interestPayment: number;
  totalPayment: number;
  remainingCapital: number;
  insurancePayment?: number;
  workspaceId?: string;
}): Promise<AmortizationLine> {
  const idLabel = data.periodDate.slice(0, 7); // "YYYY-MM"
  const page = await notion.pages.create({
    parent: { database_id: requireDbId("AMORTIZATION_LINES") },
    properties: {
      ID: { title: [{ text: { content: idLabel } }] },
      Loan: { relation: [{ id: data.loanId }] },
      "Period Date": { date: { start: data.periodDate } },
      "Capital Payment €": { number: data.capitalPayment },
      "Interest Payment €": { number: data.interestPayment },
      "Total Payment €": { number: data.totalPayment },
      "Remaining Capital €": { number: data.remainingCapital },
      ...(data.insurancePayment !== undefined && {
        "Insurance Payment €": { number: data.insurancePayment },
      }),
      ...(data.workspaceId && {
        "Workspace ID": { rich_text: [{ text: { content: data.workspaceId } }] },
      }),
    },
  });
  return pageToLine(page as NotionPage);
}

/**
 * Bulk insert amortization lines for a loan.
 * Notion rate limit ~3 req/s — 350ms delay between inserts.
 */
export async function bulkCreateAmortizationLines(
  lines: Omit<Parameters<typeof createAmortizationLine>[0], "loanId">[],
  loanId: string,
  workspaceId: string,
): Promise<void> {
  for (const line of lines) {
    await createAmortizationLine({ ...line, loanId, workspaceId });
    await new Promise((r) => setTimeout(r, 350));
  }
}

export async function listAmortizationLines(loanId: string): Promise<AmortizationLine[]> {
  const response = await notion.databases.query({
    database_id: requireDbId("AMORTIZATION_LINES"),
    filter: { property: "Loan", relation: { contains: loanId } },
    sorts: [{ property: "Period Date", direction: "ascending" }],
  });
  return response.results.map((p) => pageToLine(p as NotionPage));
}

/** Outstanding capital at a given date (latest line on or before that date) */
export async function getOutstandingCapitalAt(
  loanId: string,
  date: string,
): Promise<number | null> {
  const lines = await listAmortizationLines(loanId);
  const before = lines
    .filter((l) => l.periodDate <= date)
    .sort((a, b) => b.periodDate.localeCompare(a.periodDate));
  return before[0]?.remainingCapital ?? null;
}

/** Delete all lines for a loan (used when re-parsing an amortization table) */
export async function deleteAmortizationLines(loanId: string): Promise<void> {
  const lines = await listAmortizationLines(loanId);
  for (const line of lines) {
    await notion.pages.update({ page_id: line.id, archived: true });
    await new Promise((r) => setTimeout(r, 350));
  }
}

// Keep the helper accessible but don't export a conflicting name
export { getLineId };
