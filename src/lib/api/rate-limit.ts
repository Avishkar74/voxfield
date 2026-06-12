import { RateLimitError } from "@/lib/errors";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function getRateLimitKey(identifier: string, route: string): string {
  return `${identifier}:${route}`;
}

export function checkRateLimit(identifier: string, route: string): void {
  const key = getRateLimitKey(identifier, route);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new RateLimitError();
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);
}

export function getRateLimitIdentifier(
  userId: string | undefined,
  ipAddress: string | null,
): string {
  if (userId) {
    return `user:${userId}`;
  }

  return `ip:${ipAddress ?? "unknown"}`;
}

export function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}
