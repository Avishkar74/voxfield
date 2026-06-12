import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  checkRateLimit,
  getClientIp,
  getRateLimitIdentifier,
} from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/response";
import {
  getRequestRoute,
  requireAuth,
  requireRole,
  type AuthenticatedRequestUser,
} from "@/lib/api/middleware";
import type { UserRole } from "@/types/database";

interface ApiHandlerOptions {
  auth?: boolean;
  roles?: UserRole[];
}

interface HandlerContext {
  params: Record<string, string | string[]>;
  user?: AuthenticatedRequestUser;
}

type ApiHandler = (
  request: NextRequest,
  context: HandlerContext,
) => Promise<NextResponse>;

export function withApiHandler(
  handler: ApiHandler,
  options: ApiHandlerOptions = {},
) {
  return async (
    request: NextRequest,
    routeContext?: { params?: Promise<Record<string, string | string[]>> },
  ): Promise<NextResponse> => {
    try {
      const params = routeContext?.params ? await routeContext.params : {};
      let user: AuthenticatedRequestUser | undefined;

      if (options.auth) {
        user = await requireAuth();

        if (options.roles && options.roles.length > 0) {
          requireRole(user, options.roles);
        }
      }

      const route = getRequestRoute(request);
      const identifier = getRateLimitIdentifier(user?.id, getClientIp(request));
      checkRateLimit(identifier, route);

      return await handler(request, { params, user });
    } catch (error) {
      return apiError(error);
    }
  };
}
