import { getClientEnv } from "@/lib/env";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import type { HealthResponse } from "@/types/api";

export const GET = withApiHandler(async () => {
  const env = getClientEnv();

  const data: HealthResponse = {
    status: "ok",
    environment: env.NEXT_PUBLIC_APP_ENV,
    appName: env.NEXT_PUBLIC_APP_NAME,
  };

  return apiSuccess(data);
});
