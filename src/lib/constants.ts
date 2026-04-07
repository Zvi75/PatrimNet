export const PLANS = {
  STARTER: {
    id: "starter",
    name: "Starter",
    price: 49,
    maxAssets: 10,
    maxUsers: 1,
    features: ["Rapports basiques", "Export PDF/Word/Excel", "Support email"],
  },
  PRO: {
    id: "pro",
    name: "Pro",
    price: 149,
    maxAssets: 50,
    maxUsers: 5,
    features: ["Tout Starter", "IA (parsing + requêtes NL)", "Tous les rapports", "Alertes email"],
  },
  ENTERPRISE: {
    id: "enterprise",
    name: "Enterprise",
    price: 299,
    maxAssets: Infinity,
    maxUsers: Infinity,
    features: ["Tout Pro", "Accès API", "Support prioritaire", "Onboarding dédié"],
  },
} as const;

export const ENTITY_TYPES = [
  "SCI",
  "SNC",
  "SARL",
  "SAS",
  "SELAS",
  "SPFPL",
  "Holding",
  "Other",
] as const;

export const ASSET_TYPES = [
  "Appartement",
  "Bureau",
  "Commerce",
  "Entrepôt",
  "Local mixte",
  "Parking",
] as const;

export const ASSET_STATUSES = ["Occupé", "Vacant", "En travaux", "En vente"] as const;

export const DPE_RATINGS = ["A", "B", "C", "D", "E", "F", "G"] as const;

export const LEASE_TYPES = [
  "Bail commercial",
  "Bail d'habitation",
  "Bail meublé",
  "Convention",
] as const;

export const LEASE_STATUSES = ["Actif", "Résilié", "En cours de renouvellement", "Expiré"] as const;

export const INDEXATION_INDEXES = ["ILC", "IRL", "ICC", "None"] as const;

export const TRANSACTION_TYPES = [
  "Loyer",
  "Charge",
  "Taxe foncière",
  "CFE",
  "Assurance",
  "Travaux",
  "Remboursement emprunt",
  "Intérêts",
  "Autre",
] as const;

export const TRANSACTION_DIRECTIONS = ["Encaissement", "Décaissement"] as const;

export const TAX_REGIMES = ["IR", "IS", "TVA", "Exonéré"] as const;

export const TENANT_TYPES = ["Personne physique", "Personne morale"] as const;

export const PAYMENT_SCORES = ["Excellent", "Bon", "Moyen", "Mauvais"] as const;

export const DOCUMENT_TYPES = [
  "Bail",
  "Acte de vente",
  "DPE",
  "Assurance",
  "Tableau amortissement",
  "Diagnostic",
  "Autre",
] as const;

export const USER_ROLES = ["admin", "analyst", "read-only"] as const;

export const LEASE_ALERT_DAYS = [60, 90, 180] as const;

export const ANOMALY_THRESHOLD_PERCENT = 20;

export const TRIAL_DAYS = 14;
