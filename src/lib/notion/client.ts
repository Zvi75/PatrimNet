import { Client } from "@notionhq/client";

// Lazy-throw so build doesn't fail when env is missing during CI
export const notion = new Client({
  auth: process.env.NOTION_API_KEY ?? "placeholder_key",
});

export const DB_IDS = {
  USERS: process.env.NOTION_DB_USERS ?? "",
  WORKSPACES: process.env.NOTION_DB_WORKSPACES ?? "",
  LEGAL_ENTITIES: process.env.NOTION_DB_LEGAL_ENTITIES ?? "",
  ASSETS: process.env.NOTION_DB_ASSETS ?? "",
  LEASES: process.env.NOTION_DB_LEASES ?? "",
  TENANTS: process.env.NOTION_DB_TENANTS ?? "",
  TRANSACTIONS: process.env.NOTION_DB_TRANSACTIONS ?? "",
  LOANS: process.env.NOTION_DB_LOANS ?? "",
  AMORTIZATION_LINES: process.env.NOTION_DB_AMORTIZATION_LINES ?? "",
  DOCUMENTS: process.env.NOTION_DB_DOCUMENTS ?? "",
} as const;

// Helper: assert a DB_ID is configured before using it
export function requireDbId(key: keyof typeof DB_IDS): string {
  const id = DB_IDS[key];
  if (!id) throw new Error(`Notion database not configured: ${key}. Run /setup to initialise.`);
  return id;
}

// Helper to extract text from Notion title property
export function extractTitle(page: { properties: Record<string, unknown> }, key = "Name"): string {
  const prop = page.properties[key] as { title: Array<{ plain_text: string }> } | undefined;
  return prop?.title?.[0]?.plain_text ?? "";
}

// Helper to extract rich text
export function extractRichText(
  page: { properties: Record<string, unknown> },
  key: string,
): string {
  const prop = page.properties[key] as { rich_text: Array<{ plain_text: string }> } | undefined;
  return prop?.rich_text?.[0]?.plain_text ?? "";
}

// Helper to extract select
export function extractSelect(
  page: { properties: Record<string, unknown> },
  key: string,
): string | null {
  const prop = page.properties[key] as { select: { name: string } | null } | undefined;
  return prop?.select?.name ?? null;
}

// Helper to extract number
export function extractNumber(
  page: { properties: Record<string, unknown> },
  key: string,
): number | null {
  const prop = page.properties[key] as { number: number | null } | undefined;
  return prop?.number ?? null;
}

// Helper to extract date
export function extractDate(
  page: { properties: Record<string, unknown> },
  key: string,
): string | null {
  const prop = page.properties[key] as { date: { start: string } | null } | undefined;
  return prop?.date?.start ?? null;
}

// Helper to extract checkbox
export function extractCheckbox(
  page: { properties: Record<string, unknown> },
  key: string,
): boolean {
  const prop = page.properties[key] as { checkbox: boolean } | undefined;
  return prop?.checkbox ?? false;
}

// Helper to extract email
export function extractEmail(
  page: { properties: Record<string, unknown> },
  key: string,
): string | null {
  const prop = page.properties[key] as { email: string | null } | undefined;
  return prop?.email ?? null;
}

// Helper to extract url
export function extractUrl(
  page: { properties: Record<string, unknown> },
  key: string,
): string | null {
  const prop = page.properties[key] as { url: string | null } | undefined;
  return prop?.url ?? null;
}

// Helper to extract relation (first item)
export function extractRelationId(
  page: { properties: Record<string, unknown> },
  key: string,
): string | null {
  const prop = page.properties[key] as { relation: Array<{ id: string }> } | undefined;
  return prop?.relation?.[0]?.id ?? null;
}

// Helper to extract all relation IDs
export function extractRelationIds(
  page: { properties: Record<string, unknown> },
  key: string,
): string[] {
  const prop = page.properties[key] as { relation: Array<{ id: string }> } | undefined;
  return prop?.relation?.map((r) => r.id) ?? [];
}
