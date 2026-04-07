import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const requiredVars = [
    "CLERK_SECRET_KEY",
    "NOTION_API_KEY",
    "NOTION_DB_WORKSPACES",
    "ANTHROPIC_API_KEY",
    "STRIPE_SECRET_KEY",
  ];

  const missingVars = requiredVars.filter((v) => !process.env[v]);
  const healthy = missingVars.length === 0;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
      env: healthy ? "ok" : `missing: ${missingVars.join(", ")}`,
    },
    { status: healthy ? 200 : 503 },
  );
}
