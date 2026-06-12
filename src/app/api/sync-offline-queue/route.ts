import { withApiHandler } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/request";
import { apiSuccess } from "@/lib/api/response";
import { processOfflineQueue } from "@/services/phase2.service";

export const POST = withApiHandler(async (request) => {
  const body = await parseJsonBody(request);
  const result = await processOfflineQueue(body as never);

  return apiSuccess(result);
});