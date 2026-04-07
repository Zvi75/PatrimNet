import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/join(.*)",
  "/api/webhooks/(.*)",
  "/api/invitations/(.*)",
  "/api/health",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return NextResponse.next();

  const { userId } = await auth();

  if (!userId) {
    return (await auth()).redirectToSignIn();
  }

  // Workspace check is handled in the dashboard layout via currentUser()
  // to avoid requiring Clerk session token template configuration.
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
