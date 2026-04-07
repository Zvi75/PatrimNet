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
import type { Lease, LeaseType, LeaseStatus, IndexationIndex } from "@/types";
import { daysUntil } from "@/lib/utils";

type NotionPage = { id: string; properties: Record<string, unknown> };

function pageToLease(page: NotionPage): Lease {
  return {
    id: page.id,
    notionId: page.id,
    reference: extractTitle(page),
    assetId: extractRelationId(page, "Asset") ?? "",
    tenantId: extractRelationId(page, "Tenant") ?? "",
    type: (extractSelect(page, "Type") as LeaseType) ?? "Bail commercial",
    startDate: extractDate(page, "Start Date") ?? "",
    endDate: extractDate(page, "End Date") ?? "",
    nextRevisionDate: extractDate(page, "Next Revision Date") ?? undefined,
    baseRent: extractNumber(page, "Base Rent €") ?? 0,
    charges: extractNumber(page, "Charges €") ?? undefined,
    tvaApplicable: extractCheckbox(page, "TVA applicable"),
    indexationIndex: (extractSelect(page, "Indexation Index") as IndexationIndex) ?? undefined,
    status: (extractSelect(page, "Status") as LeaseStatus) ?? "Actif",
    workspaceId: extractRichText(page, "Workspace ID"),
  };
}

export async function createLease(data: {
  reference: string;
  assetId: string;
  tenantId: string;
  type: LeaseType;
  startDate: string;
  endDate: string;
  baseRent: number;
  workspaceId: string;
  nextRevisionDate?: string;
  charges?: number;
  tvaApplicable?: boolean;
  indexationIndex?: IndexationIndex;
  status?: LeaseStatus;
}): Promise<Lease> {
  const page = await notion.pages.create({
    parent: { database_id: requireDbId("LEASES") },
    properties: {
      Reference: { title: [{ text: { content: data.reference } }] },
      Asset: { relation: [{ id: data.assetId }] },
      Tenant: { relation: [{ id: data.tenantId }] },
      Type: { select: { name: data.type } },
      "Start Date": { date: { start: data.startDate } },
      "End Date": { date: { start: data.endDate } },
      "Base Rent €": { number: data.baseRent },
      Status: { select: { name: data.status ?? "Actif" } },
      "Workspace ID": { rich_text: [{ text: { content: data.workspaceId } }] },
      "TVA applicable": { checkbox: data.tvaApplicable ?? false },
      ...(data.nextRevisionDate && {
        "Next Revision Date": { date: { start: data.nextRevisionDate } },
      }),
      ...(data.charges !== undefined && { "Charges €": { number: data.charges } }),
      ...(data.indexationIndex && {
        "Indexation Index": { select: { name: data.indexationIndex } },
      }),
    },
  });
  return pageToLease(page as NotionPage);
}

export async function getLeaseById(id: string): Promise<Lease | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return pageToLease(page as NotionPage);
  } catch {
    return null;
  }
}

export async function listLeases(workspaceId: string): Promise<Lease[]> {
  const response = await notion.databases.query({
    database_id: requireDbId("LEASES"),
    filter: { property: "Workspace ID", rich_text: { equals: workspaceId } },
    sorts: [{ property: "End Date", direction: "ascending" }],
  });
  return response.results.map((p) => pageToLease(p as NotionPage));
}

export async function listLeasesByAsset(assetId: string): Promise<Lease[]> {
  const response = await notion.databases.query({
    database_id: requireDbId("LEASES"),
    filter: { property: "Asset", relation: { contains: assetId } },
  });
  return response.results.map((p) => pageToLease(p as NotionPage));
}

/** Active leases expiring within `days` days */
export async function getExpiringLeases(workspaceId: string, days: number): Promise<Lease[]> {
  const leases = await listLeases(workspaceId);
  return leases.filter(
    (l) =>
      l.status === "Actif" &&
      l.endDate &&
      daysUntil(l.endDate) <= days &&
      daysUntil(l.endDate) >= 0,
  );
}

export async function updateLease(
  id: string,
  data: Partial<{
    reference: string;
    assetId: string;
    tenantId: string;
    type: LeaseType;
    startDate: string;
    endDate: string;
    nextRevisionDate: string;
    baseRent: number;
    charges: number;
    tvaApplicable: boolean;
    indexationIndex: IndexationIndex;
    status: LeaseStatus;
  }>,
): Promise<void> {
  await notion.pages.update({
    page_id: id,
    properties: {
      ...(data.reference && { Reference: { title: [{ text: { content: data.reference } }] } }),
      ...(data.assetId && { Asset: { relation: [{ id: data.assetId }] } }),
      ...(data.tenantId && { Tenant: { relation: [{ id: data.tenantId }] } }),
      ...(data.type && { Type: { select: { name: data.type } } }),
      ...(data.startDate && { "Start Date": { date: { start: data.startDate } } }),
      ...(data.endDate && { "End Date": { date: { start: data.endDate } } }),
      ...(data.nextRevisionDate && {
        "Next Revision Date": { date: { start: data.nextRevisionDate } },
      }),
      ...(data.baseRent !== undefined && { "Base Rent €": { number: data.baseRent } }),
      ...(data.charges !== undefined && { "Charges €": { number: data.charges } }),
      ...(data.tvaApplicable !== undefined && {
        "TVA applicable": { checkbox: data.tvaApplicable },
      }),
      ...(data.indexationIndex && {
        "Indexation Index": { select: { name: data.indexationIndex } },
      }),
      ...(data.status && { Status: { select: { name: data.status } } }),
    },
  });
}

export async function deleteLease(id: string): Promise<void> {
  await notion.pages.update({ page_id: id, archived: true });
}

/** Total rent roll for a workspace (sum of base rent on active leases) */
export async function getRentRoll(workspaceId: string): Promise<number> {
  const leases = await listLeases(workspaceId);
  return leases.filter((l) => l.status === "Actif").reduce((sum, l) => sum + l.baseRent, 0);
}
