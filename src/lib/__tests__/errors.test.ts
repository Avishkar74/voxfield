import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  RateLimitError,
  isAppError,
  ErrorCode,
} from "../errors";

describe("Error Classes", () => {
  it("should instantiate ValidationError", () => {
    const error = new ValidationError("Invalid payload");
    expect(error.message).toBe("Invalid payload");
    expect(error.code).toBe(ErrorCode.INVALID_INPUT);
    expect(error.statusCode).toBe(400);
    expect(isAppError(error)).toBe(true);
  });

  it("should instantiate UnauthorizedError", () => {
    const error = new UnauthorizedError();
    expect(error.message).toBe("Authentication required");
    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(error.statusCode).toBe(401);
  });

  it("should instantiate NotFoundError", () => {
    const error = new NotFoundError();
    expect(error.message).toBe("Requested resource not found");
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.statusCode).toBe(404);
  });

  it("should instantiate ForbiddenError", () => {
    const error = new ForbiddenError();
    expect(error.message).toBe("You do not have permission to perform this action");
    expect(error.code).toBe(ErrorCode.FORBIDDEN);
    expect(error.statusCode).toBe(403);
  });

  it("should instantiate RateLimitError", () => {
    const error = new RateLimitError();
    expect(error.message).toBe("Rate limit exceeded. Please try again later.");
    expect(error.code).toBe(ErrorCode.RATE_LIMIT);
    expect(error.statusCode).toBe(429);
  });

  it("should return false for non-AppErrors inside isAppError", () => {
    expect(isAppError(new Error("Generic error"))).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError({})).toBe(false);
  });
});
