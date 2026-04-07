/**
 * Notion Database Setup — creates all 10 PatrimNet databases under a parent page.
 * Run once via POST /api/setup/notion.
 * Returns the database IDs to be stored in .env.local.
 */
import { notion } from "./client";

export interface NotionSetupResult {
  NOTION_DB_USERS: string;
  NOTION_DB_WORKSPACES: string;
  NOTION_DB_LEGAL_ENTITIES: string;
  NOTION_DB_ASSETS: string;
  NOTION_DB_LEASES: string;
  NOTION_DB_TENANTS: string;
  NOTION_DB_TRANSACTIONS: string;
  NOTION_DB_LOANS: string;
  NOTION_DB_AMORTIZATION_LINES: string;
  NOTION_DB_DOCUMENTS: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = Record<string, any>;

// ─── Property builders ────────────────────────────────────────────────────────

const title = (): Props => ({ title: {} });
const text = (): Props => ({ rich_text: {} });
const num = (format = "number"): Props => ({ number: { format } });
const date = (): Props => ({ date: {} });
const checkbox = (): Props => ({ checkbox: {} });
const email = (): Props => ({ email: {} });
const phone = (): Props => ({ phone_number: {} });
const url = (): Props => ({ url: {} });
const files = (): Props => ({ files: {} });
const select = (options: Array<{ name: string; color: string }>): Props => ({
  select: { options },
});
const relation = (dbId: string): Props => ({
  relation: { database_id: dbId, type: "single_property", single_property: {} },
});

// ─── Database schemas ─────────────────────────────────────────────────────────

function usersSchema(): Props {
  return {
    Name: title(),
    Email: email(),
    Role: select([
      { name: "admin", color: "red" },
      { name: "analyst", color: "blue" },
      { name: "read-only", color: "gray" },
    ]),
    "Workspace ID": text(),
    "Clerk User ID": text(),
    Plan: select([
      { name: "starter", color: "green" },
      { name: "pro", color: "blue" },
      { name: "enterprise", color: "purple" },
    ]),
    "Created At": date(),
  };
}

function workspacesSchema(): Props {
  return {
    Name: title(),
    "Owner User ID": text(),
    "Stripe Customer ID": text(),
    "Stripe Subscription ID": text(),
    Plan: select([
      { name: "starter", color: "green" },
      { name: "pro", color: "blue" },
      { name: "enterprise", color: "purple" },
    ]),
    Active: checkbox(),
    "Created At": date(),
  };
}

function legalEntitiesSchema(): Props {
  return {
    Name: title(),
    Type: select([
      { name: "SCI", color: "blue" },
      { name: "SNC", color: "green" },
      { name: "SARL", color: "orange" },
      { name: "SAS", color: "purple" },
      { name: "SELAS", color: "pink" },
      { name: "SPFPL", color: "red" },
      { name: "Holding", color: "yellow" },
      { name: "Other", color: "gray" },
    ]),
    SIREN: text(),
    "Workspace ID": text(),
    "Tax Regime": select([
      { name: "IR", color: "blue" },
      { name: "IS", color: "green" },
      { name: "TVA", color: "orange" },
      { name: "Exonéré", color: "gray" },
    ]),
    Address: text(),
    Notes: text(),
  };
}

function assetsSchema(): Props {
  return {
    Name: title(),
    Address: text(),
    Type: select([
      { name: "Appartement", color: "blue" },
      { name: "Bureau", color: "gray" },
      { name: "Commerce", color: "orange" },
      { name: "Entrepôt", color: "yellow" },
      { name: "Local mixte", color: "green" },
      { name: "Parking", color: "pink" },
    ]),
    "Surface m²": num("number"),
    "Acquisition Date": date(),
    "Acquisition Price €": num("euro"),
    "Current Market Value €": num("euro"),
    "Ownership %": num("percent"),
    "Workspace ID": text(),
    Status: select([
      { name: "Occupé", color: "green" },
      { name: "Vacant", color: "red" },
      { name: "En travaux", color: "orange" },
      { name: "En vente", color: "purple" },
    ]),
    DPE: select([
      { name: "A", color: "green" },
      { name: "B", color: "blue" },
      { name: "C", color: "yellow" },
      { name: "D", color: "orange" },
      { name: "E", color: "red" },
      { name: "F", color: "pink" },
      { name: "G", color: "gray" },
    ]),
    Notes: text(),
    Documents: files(),
  };
}

function leasesSchema(): Props {
  return {
    Reference: title(),
    Type: select([
      { name: "Bail commercial", color: "blue" },
      { name: "Bail d'habitation", color: "green" },
      { name: "Bail meublé", color: "orange" },
      { name: "Convention", color: "gray" },
    ]),
    "Start Date": date(),
    "End Date": date(),
    "Next Revision Date": date(),
    "Base Rent €": num("euro"),
    "Charges €": num("euro"),
    "TVA applicable": checkbox(),
    "Indexation Index": select([
      { name: "ILC", color: "blue" },
      { name: "IRL", color: "green" },
      { name: "ICC", color: "orange" },
      { name: "None", color: "gray" },
    ]),
    Status: select([
      { name: "Actif", color: "green" },
      { name: "Résilié", color: "red" },
      { name: "En cours de renouvellement", color: "orange" },
      { name: "Expiré", color: "gray" },
    ]),
    "Workspace ID": text(),
    Documents: files(),
  };
}

function tenantsSchema(): Props {
  return {
    Name: title(),
    Type: select([
      { name: "Personne physique", color: "blue" },
      { name: "Personne morale", color: "orange" },
    ]),
    SIRET: text(),
    Email: email(),
    Phone: phone(),
    "Guarantor Name": text(),
    "Guarantor Contact": text(),
    "Payment Score": select([
      { name: "Excellent", color: "green" },
      { name: "Bon", color: "blue" },
      { name: "Moyen", color: "orange" },
      { name: "Mauvais", color: "red" },
    ]),
    "Workspace ID": text(),
    Notes: text(),
  };
}

function transactionsSchema(): Props {
  return {
    Label: title(),
    Type: select([
      { name: "Loyer", color: "green" },
      { name: "Charge", color: "orange" },
      { name: "Taxe foncière", color: "red" },
      { name: "CFE", color: "red" },
      { name: "Assurance", color: "blue" },
      { name: "Travaux", color: "yellow" },
      { name: "Remboursement emprunt", color: "purple" },
      { name: "Intérêts", color: "pink" },
      { name: "Autre", color: "gray" },
    ]),
    "Amount €": num("euro"),
    Direction: select([
      { name: "Encaissement", color: "green" },
      { name: "Décaissement", color: "red" },
    ]),
    Date: date(),
    Reconciled: checkbox(),
    "Workspace ID": text(),
    Notes: text(),
  };
}

function loansSchema(): Props {
  return {
    Reference: title(),
    Bank: text(),
    "Initial Amount €": num("euro"),
    "Interest Rate %": num("percent"),
    "Start Date": date(),
    "End Date": date(),
    "Monthly Payment €": num("euro"),
    "Outstanding Capital €": num("euro"),
    "Amortization Table": files(),
    Parsed: checkbox(),
    "Workspace ID": text(),
    Notes: text(),
  };
}

function amortizationLinesSchema(): Props {
  return {
    ID: title(),
    "Period Date": date(),
    "Capital Payment €": num("euro"),
    "Interest Payment €": num("euro"),
    "Insurance Payment €": num("euro"),
    "Total Payment €": num("euro"),
    "Remaining Capital €": num("euro"),
    "Workspace ID": text(),
  };
}

function documentsSchema(): Props {
  return {
    Name: title(),
    Type: select([
      { name: "Bail", color: "blue" },
      { name: "Acte de vente", color: "green" },
      { name: "DPE", color: "yellow" },
      { name: "Assurance", color: "orange" },
      { name: "Tableau amortissement", color: "purple" },
      { name: "Diagnostic", color: "red" },
      { name: "Autre", color: "gray" },
    ]),
    "File URL": url(),
    "Uploaded At": date(),
    "Parsed by AI": checkbox(),
    "Extracted Data": text(),
    "Workspace ID": text(),
  };
}

// ─── Main setup function ──────────────────────────────────────────────────────

async function createDb(parentPageId: string, title: string, properties: Props): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: title } }],
    properties,
  });
  return db.id;
}

async function addRelation(dbId: string, propertyName: string, targetDbId: string): Promise<void> {
  await notion.databases.update({
    database_id: dbId,
    properties: {
      [propertyName]: {
        type: "relation",
        relation: { database_id: targetDbId, type: "single_property", single_property: {} },
      },
    },
  });
}

export async function setupNotionDatabases(parentPageId: string): Promise<NotionSetupResult> {
  // ── Phase 1: Create all databases ──────────────────────────────────────────
  const [
    usersId,
    workspacesId,
    legalEntitiesId,
    assetsId,
    leasesId,
    tenantsId,
    transactionsId,
    loansId,
    amortizationLinesId,
    documentsId,
  ] = await Promise.all([
    createDb(parentPageId, "PatrimNet — Users", usersSchema()),
    createDb(parentPageId, "PatrimNet — Workspaces", workspacesSchema()),
    createDb(parentPageId, "PatrimNet — Legal Entities", legalEntitiesSchema()),
    createDb(parentPageId, "PatrimNet — Assets", assetsSchema()),
    createDb(parentPageId, "PatrimNet — Leases", leasesSchema()),
    createDb(parentPageId, "PatrimNet — Tenants", tenantsSchema()),
    createDb(parentPageId, "PatrimNet — Transactions", transactionsSchema()),
    createDb(parentPageId, "PatrimNet — Loans", loansSchema()),
    createDb(parentPageId, "PatrimNet — Amortization Lines", amortizationLinesSchema()),
    createDb(parentPageId, "PatrimNet — Documents", documentsSchema()),
  ]);

  // ── Phase 2: Add relation properties (sequential to respect rate limits) ───

  // Legal Entities — self-referential parent
  await addRelation(legalEntitiesId, "Parent Entity", legalEntitiesId);

  // Assets — Legal Entity
  await addRelation(assetsId, "Legal Entity", legalEntitiesId);

  // Leases — Asset, Tenant
  await addRelation(leasesId, "Asset", assetsId);
  await addRelation(leasesId, "Tenant", tenantsId);

  // Transactions — Asset, Legal Entity, Lease, Loan
  await addRelation(transactionsId, "Asset", assetsId);
  await addRelation(transactionsId, "Legal Entity", legalEntitiesId);
  await addRelation(transactionsId, "Lease", leasesId);
  await addRelation(transactionsId, "Loan", loansId);

  // Loans — Asset, Legal Entity
  await addRelation(loansId, "Asset", assetsId);
  await addRelation(loansId, "Legal Entity", legalEntitiesId);

  // Amortization Lines — Loan
  await addRelation(amortizationLinesId, "Loan", loansId);

  // Documents — Asset, Lease, Loan
  await addRelation(documentsId, "Asset", assetsId);
  await addRelation(documentsId, "Lease", leasesId);
  await addRelation(documentsId, "Loan", loansId);

  return {
    NOTION_DB_USERS: usersId,
    NOTION_DB_WORKSPACES: workspacesId,
    NOTION_DB_LEGAL_ENTITIES: legalEntitiesId,
    NOTION_DB_ASSETS: assetsId,
    NOTION_DB_LEASES: leasesId,
    NOTION_DB_TENANTS: tenantsId,
    NOTION_DB_TRANSACTIONS: transactionsId,
    NOTION_DB_LOANS: loansId,
    NOTION_DB_AMORTIZATION_LINES: amortizationLinesId,
    NOTION_DB_DOCUMENTS: documentsId,
  };
}
