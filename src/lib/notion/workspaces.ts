import { notion, DB_IDS, extractTitle, extractRichText, extractSelect, extractCheckbox, extractDate } from "./client";
import type { Workspace } from "@/types";

function pageToWorkspace(page: { id: string; properties: Record<string, unknown> }): Workspace {
  return {
    id: page.id,
    notionId: page.id,
    name: extractTitle(page),
    ownerUserId: extractRichText(page, "Owner User ID"),
    stripeCustomerId: extractRichText(page, "Stripe Customer ID") || undefined,
    stripeSubscriptionId: extractRichText(page, "Stripe Subscription ID") || undefined,
    plan: (extractSelect(page, "Plan") as Workspace["plan"]) ?? "starter",
    active: extractCheckbox(page, "Active"),
    createdAt: extractDate(page, "Created At") ?? new Date().toISOString(),
  };
}

export async function createWorkspace(data: {
  name: string;
  ownerUserId: string;
}): Promise<Workspace> {
  const page = await notion.pages.create({
    parent: { database_id: DB_IDS.WORKSPACES },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      "Owner User ID": { rich_text: [{ text: { content: data.ownerUserId } }] },
      Plan: { select: { name: "starter" } },
      Active: { checkbox: true },
      "Created At": { date: { start: new Date().toISOString() } },
    },
  });

  return pageToWorkspace(page as Parameters<typeof pageToWorkspace>[0]);
}

export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return pageToWorkspace(page as Parameters<typeof pageToWorkspace>[0]);
  } catch {
    return null;
  }
}

export async function updateWorkspaceName(id: string, name: string): Promise<void> {
  await notion.pages.update({
    page_id: id,
    properties: {
      Name: { title: [{ text: { content: name } }] },
    },
  });
}

export async function updateWorkspaceStripe(
  id: string,
  data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    plan?: string;
  },
): Promise<void> {
  await notion.pages.update({
    page_id: id,
    properties: {
      ...(data.stripeCustomerId && {
        "Stripe Customer ID": {
          rich_text: [{ text: { content: data.stripeCustomerId } }],
        },
      }),
      ...(data.stripeSubscriptionId && {
        "Stripe Subscription ID": {
          rich_text: [{ text: { content: data.stripeSubscriptionId } }],
        },
      }),
      ...(data.plan && {
        Plan: { select: { name: data.plan } },
      }),
    },
  });
}
