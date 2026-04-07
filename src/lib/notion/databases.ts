/**
 * Notion database schema definitions.
 * Used by the setup script (STEP 3) to create all 10 databases.
 * Each entry maps to a Notion database with its properties.
 */

export const DATABASE_SCHEMAS = {
  users: {
    name: "PatrimNet — Users",
    properties: {
      Name: { title: {} },
      Email: { email: {} },
      Role: {
        select: {
          options: [
            { name: "admin", color: "red" },
            { name: "analyst", color: "blue" },
            { name: "read-only", color: "gray" },
          ],
        },
      },
      "Workspace ID": { rich_text: {} },
      "Clerk User ID": { rich_text: {} },
      Plan: {
        select: {
          options: [
            { name: "starter", color: "green" },
            { name: "pro", color: "blue" },
            { name: "enterprise", color: "purple" },
          ],
        },
      },
      "Created At": { date: {} },
    },
  },

  workspaces: {
    name: "PatrimNet — Workspaces",
    properties: {
      Name: { title: {} },
      "Owner User ID": { rich_text: {} },
      "Stripe Customer ID": { rich_text: {} },
      "Stripe Subscription ID": { rich_text: {} },
      Plan: {
        select: {
          options: [
            { name: "starter", color: "green" },
            { name: "pro", color: "blue" },
            { name: "enterprise", color: "purple" },
          ],
        },
      },
      Active: { checkbox: {} },
      "Created At": { date: {} },
    },
  },

  legalEntities: {
    name: "PatrimNet — Legal Entities",
    properties: {
      Name: { title: {} },
      Type: {
        select: {
          options: [
            { name: "SCI", color: "blue" },
            { name: "SNC", color: "green" },
            { name: "SARL", color: "orange" },
            { name: "SAS", color: "purple" },
            { name: "SELAS", color: "pink" },
            { name: "SPFPL", color: "red" },
            { name: "Holding", color: "yellow" },
            { name: "Other", color: "gray" },
          ],
        },
      },
      SIREN: { rich_text: {} },
      // Parent Entity relation added after DB creation
      "Workspace ID": { rich_text: {} },
      "Tax Regime": {
        select: {
          options: [
            { name: "IR", color: "blue" },
            { name: "IS", color: "green" },
            { name: "TVA", color: "orange" },
            { name: "Exonéré", color: "gray" },
          ],
        },
      },
      Address: { rich_text: {} },
      Notes: { rich_text: {} },
    },
  },

  assets: {
    name: "PatrimNet — Assets",
    properties: {
      Name: { title: {} },
      Address: { rich_text: {} },
      Type: {
        select: {
          options: [
            { name: "Appartement", color: "blue" },
            { name: "Bureau", color: "gray" },
            { name: "Commerce", color: "orange" },
            { name: "Entrepôt", color: "yellow" },
            { name: "Local mixte", color: "green" },
            { name: "Parking", color: "pink" },
          ],
        },
      },
      "Surface m²": { number: { format: "number" } },
      "Acquisition Date": { date: {} },
      "Acquisition Price €": { number: { format: "euro" } },
      "Current Market Value €": { number: { format: "euro" } },
      "Ownership %": { number: { format: "percent" } },
      // Legal Entity relation added after DB creation
      Status: {
        select: {
          options: [
            { name: "Occupé", color: "green" },
            { name: "Vacant", color: "red" },
            { name: "En travaux", color: "orange" },
            { name: "En vente", color: "purple" },
          ],
        },
      },
      DPE: {
        select: {
          options: [
            { name: "A", color: "green" },
            { name: "B", color: "blue" },
            { name: "C", color: "yellow" },
            { name: "D", color: "orange" },
            { name: "E", color: "red" },
            { name: "F", color: "pink" },
            { name: "G", color: "gray" },
          ],
        },
      },
      Notes: { rich_text: {} },
      Documents: { files: {} },
    },
  },

  leases: {
    name: "PatrimNet — Leases",
    properties: {
      Reference: { title: {} },
      // Asset relation added after DB creation
      // Tenant relation added after DB creation
      Type: {
        select: {
          options: [
            { name: "Bail commercial", color: "blue" },
            { name: "Bail d'habitation", color: "green" },
            { name: "Bail meublé", color: "orange" },
            { name: "Convention", color: "gray" },
          ],
        },
      },
      "Start Date": { date: {} },
      "End Date": { date: {} },
      "Next Revision Date": { date: {} },
      "Base Rent €": { number: { format: "euro" } },
      "Charges €": { number: { format: "euro" } },
      "TVA applicable": { checkbox: {} },
      "Indexation Index": {
        select: {
          options: [
            { name: "ILC", color: "blue" },
            { name: "IRL", color: "green" },
            { name: "ICC", color: "orange" },
            { name: "None", color: "gray" },
          ],
        },
      },
      Status: {
        select: {
          options: [
            { name: "Actif", color: "green" },
            { name: "Résilié", color: "red" },
            { name: "En cours de renouvellement", color: "orange" },
            { name: "Expiré", color: "gray" },
          ],
        },
      },
      Documents: { files: {} },
    },
  },

  tenants: {
    name: "PatrimNet — Tenants",
    properties: {
      Name: { title: {} },
      Type: {
        select: {
          options: [
            { name: "Personne physique", color: "blue" },
            { name: "Personne morale", color: "orange" },
          ],
        },
      },
      SIRET: { rich_text: {} },
      Email: { email: {} },
      Phone: { phone_number: {} },
      "Guarantor Name": { rich_text: {} },
      "Guarantor Contact": { rich_text: {} },
      "Payment Score": {
        select: {
          options: [
            { name: "Excellent", color: "green" },
            { name: "Bon", color: "blue" },
            { name: "Moyen", color: "orange" },
            { name: "Mauvais", color: "red" },
          ],
        },
      },
      Notes: { rich_text: {} },
    },
  },

  transactions: {
    name: "PatrimNet — Transactions",
    properties: {
      Label: { title: {} },
      // Asset, Legal Entity, Lease, Loan relations added after DB creation
      Type: {
        select: {
          options: [
            { name: "Loyer", color: "green" },
            { name: "Charge", color: "orange" },
            { name: "Taxe foncière", color: "red" },
            { name: "CFE", color: "red" },
            { name: "Assurance", color: "blue" },
            { name: "Travaux", color: "yellow" },
            { name: "Remboursement emprunt", color: "purple" },
            { name: "Intérêts", color: "pink" },
            { name: "Autre", color: "gray" },
          ],
        },
      },
      "Amount €": { number: { format: "euro" } },
      Direction: {
        select: {
          options: [
            { name: "Encaissement", color: "green" },
            { name: "Décaissement", color: "red" },
          ],
        },
      },
      Date: { date: {} },
      Reconciled: { checkbox: {} },
      Notes: { rich_text: {} },
    },
  },

  loans: {
    name: "PatrimNet — Loans",
    properties: {
      Reference: { title: {} },
      // Asset, Legal Entity relations added after DB creation
      Bank: { rich_text: {} },
      "Initial Amount €": { number: { format: "euro" } },
      "Interest Rate %": { number: { format: "percent" } },
      "Start Date": { date: {} },
      "End Date": { date: {} },
      "Monthly Payment €": { number: { format: "euro" } },
      "Outstanding Capital €": { number: { format: "euro" } },
      "Amortization Table": { files: {} },
      Parsed: { checkbox: {} },
      Notes: { rich_text: {} },
    },
  },

  amortizationLines: {
    name: "PatrimNet — Amortization Lines",
    properties: {
      ID: { title: {} },
      // Loan relation added after DB creation
      "Period Date": { date: {} },
      "Capital Payment €": { number: { format: "euro" } },
      "Interest Payment €": { number: { format: "euro" } },
      "Insurance Payment €": { number: { format: "euro" } },
      "Total Payment €": { number: { format: "euro" } },
      "Remaining Capital €": { number: { format: "euro" } },
    },
  },

  documents: {
    name: "PatrimNet — Documents",
    properties: {
      Name: { title: {} },
      // Asset, Lease, Loan relations added after DB creation
      Type: {
        select: {
          options: [
            { name: "Bail", color: "blue" },
            { name: "Acte de vente", color: "green" },
            { name: "DPE", color: "yellow" },
            { name: "Assurance", color: "orange" },
            { name: "Tableau amortissement", color: "purple" },
            { name: "Diagnostic", color: "red" },
            { name: "Autre", color: "gray" },
          ],
        },
      },
      "File URL": { url: {} },
      "Uploaded At": { date: {} },
      "Parsed by AI": { checkbox: {} },
      "Extracted Data": { rich_text: {} },
    },
  },
} as const;
