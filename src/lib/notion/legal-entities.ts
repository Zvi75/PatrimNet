import {
  notion,
  requireDbId,
  extractTitle,
  extractRichText,
  extractSelect,
  extractRelationId,
} from "./client";
import type { LegalEntity, EntityType, TaxRegime } from "@/types";

type NotionPage = { id: string; properties: Record<string, unknown> };

function pageToEntity(page: NotionPage): LegalEntity {
  return {
    id: page.id,
    notionId: page.id,
    name: extractTitle(page),
    type: (extractSelect(page, "Type") as EntityType) ?? "Other",
    siren: extractRichText(page, "SIREN") || undefined,
    parentEntityId: extractRelationId(page, "Parent Entity") ?? undefined,
    workspaceId: extractRichText(page, "Workspace ID"),
    taxRegime: (extractSelect(page, "Tax Regime") as TaxRegime) ?? undefined,
    address: extractRichText(page, "Address") || undefined,
    notes: extractRichText(page, "Notes") || undefined,
  };
}

export async function createLegalEntity(data: {
  name: string;
  type: EntityType;
  siren?: string;
  parentEntityId?: string;
  workspaceId: string;
  taxRegime?: TaxRegime;
  address?: string;
  notes?: string;
}): Promise<LegalEntity> {
  const page = await notion.pages.create({
    parent: { database_id: requireDbId("LEGAL_ENTITIES") },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      Type: { select: { name: data.type } },
      SIREN: { rich_text: [{ text: { content: data.siren ?? "" } }] },
      "Workspace ID": { rich_text: [{ text: { content: data.workspaceId } }] },
      ...(data.taxRegime && { "Tax Regime": { select: { name: data.taxRegime } } }),
      ...(data.address && { Address: { rich_text: [{ text: { content: data.address } }] } }),
      ...(data.notes && { Notes: { rich_text: [{ text: { content: data.notes } }] } }),
      ...(data.parentEntityId && {
        "Parent Entity": { relation: [{ id: data.parentEntityId }] },
      }),
    },
  });
  return pageToEntity(page as NotionPage);
}

export async function getLegalEntityById(id: string): Promise<LegalEntity | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return pageToEntity(page as NotionPage);
  } catch {
    return null;
  }
}

export async function listLegalEntities(workspaceId: string): Promise<LegalEntity[]> {
  const response = await notion.databases.query({
    database_id: requireDbId("LEGAL_ENTITIES"),
    filter: { property: "Workspace ID", rich_text: { equals: workspaceId } },
    sorts: [{ property: "Name", direction: "ascending" }],
  });
  return response.results.map((p) => pageToEntity(p as NotionPage));
}

export async function updateLegalEntity(
  id: string,
  data: Partial<{
    name: string;
    type: EntityType;
    siren: string;
    parentEntityId: string | null;
    taxRegime: TaxRegime;
    address: string;
    notes: string;
  }>,
): Promise<void> {
  await notion.pages.update({
    page_id: id,
    properties: {
      ...(data.name && { Name: { title: [{ text: { content: data.name } }] } }),
      ...(data.type && { Type: { select: { name: data.type } } }),
      ...(data.siren !== undefined && {
        SIREN: { rich_text: [{ text: { content: data.siren } }] },
      }),
      ...(data.taxRegime && { "Tax Regime": { select: { name: data.taxRegime } } }),
      ...(data.address !== undefined && {
        Address: { rich_text: [{ text: { content: data.address } }] },
      }),
      ...(data.notes !== undefined && {
        Notes: { rich_text: [{ text: { content: data.notes } }] },
      }),
      ...(data.parentEntityId !== undefined && {
        "Parent Entity": data.parentEntityId
          ? { relation: [{ id: data.parentEntityId }] }
          : { relation: [] },
      }),
    },
  });
}

export async function deleteLegalEntity(id: string): Promise<void> {
  await notion.pages.update({ page_id: id, archived: true });
}

/** Build tree from flat list */
export function buildEntityTree(entities: LegalEntity[]): LegalEntity[] {
  const map = new Map(entities.map((e) => [e.id, { ...e, children: [] as LegalEntity[] }]));
  const roots: LegalEntity[] = [];

  for (const entity of Array.from(map.values())) {
    if (entity.parentEntityId) {
      const parent = map.get(entity.parentEntityId);
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(entity);
      } else {
        roots.push(entity);
      }
    } else {
      roots.push(entity);
    }
  }

  return roots;
}
