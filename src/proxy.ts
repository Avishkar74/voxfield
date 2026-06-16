import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Edge proxy — equivalent to Next.js middleware.
 * This version of Next.js uses proxy.ts instead of middleware.ts.
 *
 * Responsibilities:
 *   1. Refresh Supabase session cookies (prevents 401s on server components).
 *   2. Redirect unauthenticated requests to /login.
 *   3. Redirect authenticated users away from /login to their dashboard.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico   (browser icon)
     *  - manifest.json / service worker / icons (PWA assets)
     *  - Static asset file extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)$).*)",
  ],
};
