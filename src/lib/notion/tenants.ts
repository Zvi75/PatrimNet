import {
  notion,
  requireDbId,
  extractTitle,
  extractRichText,
  extractSelect,
  extractEmail,
} from "./client";
import type { Tenant, TenantType, PaymentScore } from "@/types";
import { isDemoMode } from "@/lib/demo";
import * as demo from "@/lib/demo/data";

type NotionPage = { id: string; properties: Record<string, unknown> };

function pageToTenant(page: NotionPage): Tenant {
  const phoneProp = (page.properties as Record<string, { phone_number?: string | null }>)["Phone"];

  return {
    id: page.id,
    notionId: page.id,
    name: extractTitle(page),
    type: (extractSelect(page, "Type") as TenantType) ?? "Personne physique",
    siret: extractRichText(page, "SIRET") || undefined,
    email: extractEmail(page, "Email") ?? undefined,
    phone: phoneProp?.phone_number ?? undefined,
    guarantorName: extractRichText(page, "Guarantor Name") || undefined,
    guarantorContact: extractRichText(page, "Guarantor Contact") || undefined,
    paymentScore: (extractSelect(page, "Payment Score") as PaymentScore) ?? undefined,
    notes: extractRichText(page, "Notes") || undefined,
  };
}

export async function createTenant(data: {
  name: string;
  type: TenantType;
  workspaceId: string;
  siret?: string;
  email?: string;
  phone?: string;
  guarantorName?: string;
  guarantorContact?: string;
  paymentScore?: PaymentScore;
  notes?: string;
}): Promise<Tenant> {
  if (isDemoMode()) {
    return {
      id: `demo-tenant-new-${Date.now()}`,
      name: data.name,
      type: data.type,
      siret: data.siret,
      email: data.email,
      phone: data.phone,
      guarantorName: data.guarantorName,
      guarantorContact: data.guarantorContact,
      paymentScore: data.paymentScore,
      notes: data.notes,
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: requireDbId("TENANTS") },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      Type: { select: { name: data.type } },
      "Workspace ID": { rich_text: [{ text: { content: data.workspaceId } }] },
      ...(data.siret && { SIRET: { rich_text: [{ text: { content: data.siret } }] } }),
      ...(data.email && { Email: { email: data.email } }),
      ...(data.phone && { Phone: { phone_number: data.phone } }),
      ...(data.guarantorName && {
        "Guarantor Name": { rich_text: [{ text: { content: data.guarantorName } }] },
      }),
      ...(data.guarantorContact && {
        "Guarantor Contact": { rich_text: [{ text: { content: data.guarantorContact } }] },
      }),
      ...(data.paymentScore && { "Payment Score": { select: { name: data.paymentScore } } }),
      ...(data.notes && { Notes: { rich_text: [{ text: { content: data.notes } }] } }),
    },
  });
  return pageToTenant(page as NotionPage);
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  if (isDemoMode()) return demo.TENANTS.find((t) => t.id === id) ?? null;

  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return pageToTenant(page as NotionPage);
  } catch {
    return null;
  }
}

export async function listTenants(workspaceId: string): Promise<Tenant[]> {
  if (isDemoMode()) return demo.TENANTS;

  const response = await notion.databases.query({
    database_id: requireDbId("TENANTS"),
    filter: { property: "Workspace ID", rich_text: { equals: workspaceId } },
    sorts: [{ property: "Name", direction: "ascending" }],
  });
  return response.results.map((p) => pageToTenant(p as NotionPage));
}

export async function updateTenant(
  id: string,
  data: Partial<{
    name: string;
    type: TenantType;
    siret: string;
    email: string;
    phone: string;
    guarantorName: string;
    guarantorContact: string;
    paymentScore: PaymentScore;
    notes: string;
  }>,
): Promise<void> {
  if (isDemoMode()) return;

  await notion.pages.update({
    page_id: id,
    properties: {
      ...(data.name && { Name: { title: [{ text: { content: data.name } }] } }),
      ...(data.type && { Type: { select: { name: data.type } } }),
      ...(data.siret !== undefined && {
        SIRET: { rich_text: [{ text: { content: data.siret } }] },
      }),
      ...(data.email !== undefined && { Email: { email: data.email } }),
      ...(data.phone !== undefined && { Phone: { phone_number: data.phone } }),
      ...(data.guarantorName !== undefined && {
        "Guarantor Name": { rich_text: [{ text: { content: data.guarantorName } }] },
      }),
      ...(data.guarantorContact !== undefined && {
        "Guarantor Contact": { rich_text: [{ text: { content: data.guarantorContact } }] },
      }),
      ...(data.paymentScore && { "Payment Score": { select: { name: data.paymentScore } } }),
      ...(data.notes !== undefined && {
        Notes: { rich_text: [{ text: { content: data.notes } }] },
      }),
    },
  });
}

export async function deleteTenant(id: string): Promise<void> {
  if (isDemoMode()) return;
  await notion.pages.update({ page_id: id, archived: true });
}
