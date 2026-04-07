export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export const DEMO_WORKSPACE_ID = "demo-workspace-0001";
export const DEMO_USER_ID = "demo-user-0001";
