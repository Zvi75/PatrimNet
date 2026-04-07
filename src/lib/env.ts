/**
 * Validates required environment variables at startup.
 * Called in next.config.ts to fail fast before the server starts.
 */
const REQUIRED_SERVER_VARS = [
  "CLERK_SECRET_KEY",
  "NOTION_API_KEY",
  "NOTION_DB_USERS",
  "NOTION_DB_WORKSPACES",
  "NOTION_DB_LEGAL_ENTITIES",
  "NOTION_DB_ASSETS",
  "NOTION_DB_LEASES",
  "NOTION_DB_TENANTS",
  "NOTION_DB_TRANSACTIONS",
  "NOTION_DB_LOANS",
  "NOTION_DB_AMORTIZATION_LINES",
  "NOTION_DB_DOCUMENTS",
  "ANTHROPIC_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_ENTERPRISE",
] as const;

const REQUIRED_PUBLIC_VARS = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "NEXT_PUBLIC_APP_URL"] as const;

export function validateEnv(): void {
  // In demo mode, Notion/Stripe/Anthropic credentials are not required.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    const missingPublic: string[] = [];
    for (const key of REQUIRED_PUBLIC_VARS) {
      if (!process.env[key]) missingPublic.push(key);
    }
    if (!process.env.CLERK_SECRET_KEY) missingPublic.push("CLERK_SECRET_KEY");
    if (missingPublic.length > 0) {
      throw new Error(
        `[PatrimNet] Missing required environment variables:\n${missingPublic.map((k) => `  • ${k}`).join("\n")}\n\nSee .env.local.example for reference.`,
      );
    }
    return;
  }

  const missing: string[] = [];
  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]) missing.push(key);
  }
  for (const key of REQUIRED_PUBLIC_VARS) {
    if (!process.env[key]) missing.push(key);
  }

  if (missing.length > 0) {
    throw new Error(
      `[PatrimNet] Missing required environment variables:\n${missing.map((k) => `  • ${k}`).join("\n")}\n\nSee .env.local.example for reference.`,
    );
  }
}
