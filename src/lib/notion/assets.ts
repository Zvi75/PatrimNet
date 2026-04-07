import {
  notion,
  requireDbId,
  extractTitle,
  extractRichText,
  extractSelect,
  extractNumber,
  extractDate,
  extractRelationId,
} from "./client";
import type { Asset, AssetType, AssetStatus, DPERating } from "@/types";
import { isDemoMode } from "@/lib/demo";
import * as demo from "@/lib/demo/data";

type NotionPage = { id: string; properties: Record<string, unknown> };

function pageToAsset(page: NotionPage): Asset {
  return {
    id: page.id,
    notionId: page.id,
    name: extractTitle(page),
    address: extractRichText(page, "Address"),
    type: (extractSelect(page, "Type") as AssetType) ?? "Appartement",
    surfaceM2: extractNumber(page, "Surface m²") ?? undefined,
    acquisitionDate: extractDate(page, "Acquisition Date") ?? undefined,
    acquisitionPrice: extractNumber(page, "Acquisition Price €") ?? undefined,
    currentMarketValue: extractNumber(page, "Current Market Value €") ?? undefined,
    ownershipPercent: extractNumber(page, "Ownership %") ?? undefined,
    legalEntityId: extractRelationId(page, "Legal Entity") ?? "",
    workspaceId: extractRichText(page, "Workspace ID"),
    status: (extractSelect(page, "Status") as AssetStatus) ?? "Vacant",
    dpe: (extractSelect(page, "DPE") as DPERating) ?? undefined,
    notes: extractRichText(page, "Notes") || undefined,
  };
}

export async function createAsset(data: {
  name: string;
  address: string;
  type: AssetType;
  legalEntityId: string;
  workspaceId: string;
  status: AssetStatus;
  surfaceM2?: number;
  acquisitionDate?: string;
  acquisitionPrice?: number;
  currentMarketValue?: number;
  ownershipPercent?: number;
  dpe?: DPERating;
  notes?: string;
}): Promise<Asset> {
  if (isDemoMode()) {
    return {
      id: `demo-asset-new-${Date.now()}`,
      notionId: undefined,
      name: data.name,
      address: data.address,
      type: data.type,
      legalEntityId: data.legalEntityId,
      workspaceId: data.workspaceId,
      status: data.status,
      surfaceM2: data.surfaceM2,
      acquisitionDate: data.acquisitionDate,
      acquisitionPrice: data.acquisitionPrice,
      currentMarketValue: data.currentMarketValue,
      ownershipPercent: data.ownershipPercent,
      dpe: data.dpe,
      notes: data.notes,
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: requireDbId("ASSETS") },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      Address: { rich_text: [{ text: { content: data.address } }] },
      Type: { select: { name: data.type } },
      Status: { select: { name: data.status } },
      "Legal Entity": { relation: [{ id: data.legalEntityId }] },
      "Workspace ID": { rich_text: [{ text: { content: data.workspaceId } }] },
      ...(data.surfaceM2 !== undefined && { "Surface m²": { number: data.surfaceM2 } }),
      ...(data.acquisitionDate && {
        "Acquisition Date": { date: { start: data.acquisitionDate } },
      }),
      ...(data.acquisitionPrice !== undefined && {
        "Acquisition Price €": { number: data.acquisitionPrice },
      }),
      ...(data.currentMarketValue !== undefined && {
        "Current Market Value €": { number: data.currentMarketValue },
      }),
      ...(data.ownershipPercent !== undefined && {
        "Ownership %": { number: data.ownershipPercent },
      }),
      ...(data.dpe && { DPE: { select: { name: data.dpe } } }),
      ...(data.notes && { Notes: { rich_text: [{ text: { content: data.notes } }] } }),
    },
  });
  return pageToAsset(page as NotionPage);
}

export async function getAssetById(id: string): Promise<Asset | null> {
  if (isDemoMode()) return demo.ASSETS.find((a) => a.id === id) ?? null;

  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return pageToAsset(page as NotionPage);
  } catch {
    return null;
  }
}

export async function listAssets(workspaceId: string): Promise<Asset[]> {
  if (isDemoMode()) return demo.ASSETS.filter((a) => a.workspaceId === workspaceId);

  const response = await notion.databases.query({
    database_id: requireDbId("ASSETS"),
    filter: { property: "Workspace ID", rich_text: { equals: workspaceId } },
    sorts: [{ property: "Name", direction: "ascending" }],
  });
  return response.results.map((p) => pageToAsset(p as NotionPage));
}

export async function listAssetsByEntity(legalEntityId: string): Promise<Asset[]> {
  if (isDemoMode()) return demo.ASSETS.filter((a) => a.legalEntityId === legalEntityId);

  const response = await notion.databases.query({
    database_id: requireDbId("ASSETS"),
    filter: { property: "Legal Entity", relation: { contains: legalEntityId } },
    sorts: [{ property: "Name", direction: "ascending" }],
  });
  return response.results.map((p) => pageToAsset(p as NotionPage));
}

export async function updateAsset(
  id: string,
  data: Partial<{
    name: string;
    address: string;
    type: AssetType;
    status: AssetStatus;
    surfaceM2: number;
    acquisitionDate: string;
    acquisitionPrice: number;
    currentMarketValue: number;
    ownershipPercent: number;
    legalEntityId: string;
    dpe: DPERating;
    notes: string;
  }>,
): Promise<void> {
  if (isDemoMode()) return;

  await notion.pages.update({
    page_id: id,
    properties: {
      ...(data.name && { Name: { title: [{ text: { content: data.name } }] } }),
      ...(data.address !== undefined && {
        Address: { rich_text: [{ text: { content: data.address } }] },
      }),
      ...(data.type && { Type: { select: { name: data.type } } }),
      ...(data.status && { Status: { select: { name: data.status } } }),
      ...(data.surfaceM2 !== undefined && { "Surface m²": { number: data.surfaceM2 } }),
      ...(data.acquisitionDate && {
        "Acquisition Date": { date: { start: data.acquisitionDate } },
      }),
      ...(data.acquisitionPrice !== undefined && {
        "Acquisition Price €": { number: data.acquisitionPrice },
      }),
      ...(data.currentMarketValue !== undefined && {
        "Current Market Value €": { number: data.currentMarketValue },
      }),
      ...(data.ownershipPercent !== undefined && {
        "Ownership %": { number: data.ownershipPercent },
      }),
      ...(data.legalEntityId && { "Legal Entity": { relation: [{ id: data.legalEntityId }] } }),
      ...(data.dpe && { DPE: { select: { name: data.dpe } } }),
      ...(data.notes !== undefined && {
        Notes: { rich_text: [{ text: { content: data.notes } }] },
      }),
    },
  });
}

export async function deleteAsset(id: string): Promise<void> {
  if (isDemoMode()) return;
  await notion.pages.update({ page_id: id, archived: true });
}

export async function countAssets(workspaceId: string): Promise<number> {
  if (isDemoMode()) return demo.ASSETS.filter((a) => a.workspaceId === workspaceId).length;

  const response = await notion.databases.query({
    database_id: requireDbId("ASSETS"),
    filter: { property: "Workspace ID", rich_text: { equals: workspaceId } },
    page_size: 100,
  });
  return response.results.length;
}
