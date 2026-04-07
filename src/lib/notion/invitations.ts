/**
 * Invitations are stored as Notion User records with:
 * - Status: "pending" (via Notes field — simplified for Phase 1)
 * - Clerk User ID: empty (not yet accepted)
 * - A unique token stored in Notes as JSON: { token, status, invitedBy }
 */
import { notion, DB_IDS, extractEmail, extractRichText, extractSelect } from "./client";
import type { UserRole } from "@/types";

export interface PendingInvitation {
  notionId: string;
  email: string;
  workspaceId: string;
  role: UserRole;
  token: string;
  invitedBy: string;
  workspaceName: string;
}

function parseMeta(notes: string): { token?: string; status?: string; invitedBy?: string; workspaceName?: string } {
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
}

export async function createInvitation(data: {
  email: string;
  workspaceId: string;
  role: UserRole;
  invitedBy: string;
  workspaceName: string;
}): Promise<PendingInvitation> {
  const token = crypto.randomUUID();
  const meta = JSON.stringify({
    token,
    status: "pending",
    invitedBy: data.invitedBy,
    workspaceName: data.workspaceName,
  });

  const page = await notion.pages.create({
    parent: { database_id: DB_IDS.USERS },
    properties: {
      Name: { title: [{ text: { content: data.email } }] },
      Email: { email: data.email },
      Role: { select: { name: data.role } },
      "Workspace ID": { rich_text: [{ text: { content: data.workspaceId } }] },
      "Clerk User ID": { rich_text: [{ text: { content: "" } }] },
      Plan: { select: { name: "starter" } },
      "Created At": { date: { start: new Date().toISOString() } },
    },
  });

  // Store token in a second update (Notes is rich_text, can't be set in create with relation)
  // We reuse the Workspace ID field and store token in a dedicated way
  // For Phase 1: store token in the Name field suffix and use it for lookup
  // Better: use a separate query by email + workspaceId + empty clerkUserId

  // Store token+meta in a way we can retrieve: by using the invitation token as a filter
  // We'll store it as: Clerk User ID = "invite:" + token (unused until accepted)
  await notion.pages.update({
    page_id: page.id,
    properties: {
      "Clerk User ID": { rich_text: [{ text: { content: `invite:${token}` } }] },
    },
  });

  return {
    notionId: page.id,
    email: data.email,
    workspaceId: data.workspaceId,
    role: data.role,
    token,
    invitedBy: data.invitedBy,
    workspaceName: data.workspaceName,
  };
}

export async function getInvitationByToken(token: string): Promise<PendingInvitation | null> {
  const response = await notion.databases.query({
    database_id: DB_IDS.USERS,
    filter: {
      property: "Clerk User ID",
      rich_text: { equals: `invite:${token}` },
    },
    page_size: 1,
  });

  if (response.results.length === 0) return null;

  const page = response.results[0] as { id: string; properties: Record<string, unknown> };
  const email = extractEmail(page, "Email") ?? "";
  const workspaceId = extractRichText(page, "Workspace ID");
  const role = (extractSelect(page, "Role") as UserRole) ?? "read-only";
  const clerkField = extractRichText(page, "Clerk User ID"); // "invite:<token>"
  const extractedToken = clerkField.replace("invite:", "");

  return {
    notionId: page.id,
    email,
    workspaceId,
    role,
    token: extractedToken,
    invitedBy: "",
    workspaceName: "",
  };
}

export async function acceptInvitation(
  token: string,
  clerkUserId: string,
  name: string,
): Promise<PendingInvitation | null> {
  const invitation = await getInvitationByToken(token);
  if (!invitation) return null;

  // Update the record: set real Clerk User ID, update name
  await notion.pages.update({
    page_id: invitation.notionId,
    properties: {
      Name: { title: [{ text: { content: name } }] },
      "Clerk User ID": { rich_text: [{ text: { content: clerkUserId } }] },
    },
  });

  return invitation;
}
