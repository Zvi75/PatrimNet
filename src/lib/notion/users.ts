import {
  notion,
  DB_IDS,
  extractTitle,
  extractEmail,
  extractSelect,
  extractRichText,
  extractDate,
} from "./client";
import type { User, UserRole } from "@/types";
import { isDemoMode } from "@/lib/demo";
import * as demo from "@/lib/demo/data";

function pageToUser(page: { id: string; properties: Record<string, unknown> }): User {
  return {
    id: page.id,
    notionId: page.id,
    name: extractTitle(page),
    email: extractEmail(page, "Email") ?? "",
    role: (extractSelect(page, "Role") as UserRole) ?? "read-only",
    workspaceId: extractRichText(page, "Workspace ID"),
    clerkUserId: extractRichText(page, "Clerk User ID"),
    plan: (extractSelect(page, "Plan") as User["plan"]) ?? "starter",
    createdAt: extractDate(page, "Created At") ?? new Date().toISOString(),
  };
}

export async function createUser(data: {
  name: string;
  email: string;
  role: UserRole;
  workspaceId: string;
  clerkUserId: string;
  plan?: string;
}): Promise<User> {
  if (isDemoMode()) return demo.USERS[0];

  const page = await notion.pages.create({
    parent: { database_id: DB_IDS.USERS },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      Email: { email: data.email },
      Role: { select: { name: data.role } },
      "Workspace ID": { rich_text: [{ text: { content: data.workspaceId } }] },
      "Clerk User ID": { rich_text: [{ text: { content: data.clerkUserId } }] },
      Plan: { select: { name: data.plan ?? "starter" } },
      "Created At": { date: { start: new Date().toISOString() } },
    },
  });

  return pageToUser(page as Parameters<typeof pageToUser>[0]);
}

export async function getUserByClerkId(clerkUserId: string): Promise<User | null> {
  if (isDemoMode()) return demo.USERS[0];

  const response = await notion.databases.query({
    database_id: DB_IDS.USERS,
    filter: {
      property: "Clerk User ID",
      rich_text: { equals: clerkUserId },
    },
    page_size: 1,
  });

  if (response.results.length === 0) return null;
  return pageToUser(response.results[0] as Parameters<typeof pageToUser>[0]);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (isDemoMode()) return demo.USERS.find((u) => u.email === email) ?? null;

  const response = await notion.databases.query({
    database_id: DB_IDS.USERS,
    filter: {
      property: "Email",
      email: { equals: email },
    },
    page_size: 1,
  });

  if (response.results.length === 0) return null;
  return pageToUser(response.results[0] as Parameters<typeof pageToUser>[0]);
}

export async function getWorkspaceMembers(workspaceId: string): Promise<User[]> {
  if (isDemoMode()) return demo.USERS.filter((u) => u.workspaceId === workspaceId);

  const response = await notion.databases.query({
    database_id: DB_IDS.USERS,
    filter: {
      property: "Workspace ID",
      rich_text: { equals: workspaceId },
    },
    sorts: [{ property: "Created At", direction: "ascending" }],
  });

  return response.results.map((p) => pageToUser(p as Parameters<typeof pageToUser>[0]));
}

export async function updateUserRole(notionPageId: string, role: UserRole): Promise<void> {
  if (isDemoMode()) return;

  await notion.pages.update({
    page_id: notionPageId,
    properties: {
      Role: { select: { name: role } },
    },
  });
}

export async function removeUserFromWorkspace(notionPageId: string): Promise<void> {
  if (isDemoMode()) return;

  await notion.pages.update({
    page_id: notionPageId,
    archived: true,
  });
}

export async function updateUserClerkId(notionPageId: string, clerkUserId: string): Promise<void> {
  if (isDemoMode()) return;

  await notion.pages.update({
    page_id: notionPageId,
    properties: {
      "Clerk User ID": { rich_text: [{ text: { content: clerkUserId } }] },
    },
  });
}
