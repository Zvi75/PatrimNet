export function isDemoMode(): boolean {
  // DEMO_MODE (plain, server-only) takes precedence over the NEXT_PUBLIC_ variant
  // because Next.js inlines NEXT_PUBLIC_* at build time — making it unreliable if
  // the variable was added to Vercel after the last build.
  return process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export const DEMO_WORKSPACE_ID = "demo-workspace-0001";
export const DEMO_USER_ID = "demo-user-0001";
