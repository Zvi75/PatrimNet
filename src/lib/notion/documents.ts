import {
  notion,
  requireDbId,
  extractTitle,
  extractRichText,
  extractSelect,
  extractDate,
  extractCheckbox,
  extractUrl,
  extractRelationId,
} from "./client";
import type { Document, DocumentType } from "@/types";
import { isDemoMode } from "@/lib/demo";
import * as demo from "@/lib/demo/data";

type NotionPage = { id: string; properties: Record<string, unknown> };

function pageToDocument(page: NotionPage): Document {
  return {
    id: page.id,
    notionId: page.id,
    name: extractTitle(page),
    assetId: extractRelationId(page, "Asset") ?? undefined,
    leaseId: extractRelationId(page, "Lease") ?? undefined,
    loanId: extractRelationId(page, "Loan") ?? undefined,
    type: (extractSelect(page, "Type") as DocumentType) ?? "Autre",
    fileUrl: extractUrl(page, "File URL") ?? "",
    uploadedAt: extractDate(page, "Uploaded At") ?? new Date().toISOString(),
    parsedByAI: extractCheckbox(page, "Parsed by AI"),
    extractedData: extractRichText(page, "Extracted Data") || undefined,
    workspaceId: extractRichText(page, "Workspace ID"),
  };
}

export async function createDocument(data: {
  name: string;
  type: DocumentType;
  fileUrl: string;
  workspaceId: string;
  assetId?: string;
  leaseId?: string;
  loanId?: string;
}): Promise<Document> {
  if (isDemoMode()) {
    return {
      id: `demo-doc-new-${Date.now()}`,
      name: data.name,
      type: data.type,
      fileUrl: data.fileUrl,
      workspaceId: data.workspaceId,
      assetId: data.assetId,
      leaseId: data.leaseId,
      loanId: data.loanId,
      uploadedAt: new Date().toISOString(),
      parsedByAI: false,
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: requireDbId("DOCUMENTS") },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      Type: { select: { name: data.type } },
      "File URL": { url: data.fileUrl },
      "Uploaded At": { date: { start: new Date().toISOString() } },
      "Parsed by AI": { checkbox: false },
      "Workspace ID": { rich_text: [{ text: { content: data.workspaceId } }] },
      ...(data.assetId && { Asset: { relation: [{ id: data.assetId }] } }),
      ...(data.leaseId && { Lease: { relation: [{ id: data.leaseId }] } }),
      ...(data.loanId && { Loan: { relation: [{ id: data.loanId }] } }),
    },
  });
  return pageToDocument(page as NotionPage);
}

export async function getDocumentById(id: string): Promise<Document | null> {
  if (isDemoMode()) return demo.DOCUMENTS.find((d) => d.id === id) ?? null;

  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return pageToDocument(page as NotionPage);
  } catch {
    return null;
  }
}

export async function listDocuments(workspaceId: string): Promise<Document[]> {
  if (isDemoMode()) return demo.DOCUMENTS.filter((d) => d.workspaceId === workspaceId);

  const response = await notion.databases.query({
    database_id: requireDbId("DOCUMENTS"),
    filter: { property: "Workspace ID", rich_text: { equals: workspaceId } },
    sorts: [{ property: "Uploaded At", direction: "descending" }],
  });
  return response.results.map((p) => pageToDocument(p as NotionPage));
}

export async function listDocumentsByAsset(assetId: string): Promise<Document[]> {
  if (isDemoMode()) return demo.DOCUMENTS.filter((d) => d.assetId === assetId);

  const response = await notion.databases.query({
    database_id: requireDbId("DOCUMENTS"),
    filter: { property: "Asset", relation: { contains: assetId } },
    sorts: [{ property: "Uploaded At", direction: "descending" }],
  });
  return response.results.map((p) => pageToDocument(p as NotionPage));
}

export async function listDocumentsByLease(leaseId: string): Promise<Document[]> {
  if (isDemoMode()) return demo.DOCUMENTS.filter((d) => d.leaseId === leaseId);

  const response = await notion.databases.query({
    database_id: requireDbId("DOCUMENTS"),
    filter: { property: "Lease", relation: { contains: leaseId } },
    sorts: [{ property: "Uploaded At", direction: "descending" }],
  });
  return response.results.map((p) => pageToDocument(p as NotionPage));
}

export async function markDocumentParsed(id: string, extractedData: string): Promise<void> {
  if (isDemoMode()) return;

  await notion.pages.update({
    page_id: id,
    properties: {
      "Parsed by AI": { checkbox: true },
      "Extracted Data": { rich_text: [{ text: { content: extractedData.slice(0, 2000) } }] },
    },
  });
}

export async function deleteDocument(id: string): Promise<void> {
  if (isDemoMode()) return;
  await notion.pages.update({ page_id: id, archived: true });
}
