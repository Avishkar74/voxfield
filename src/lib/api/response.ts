import { NextResponse } from "next/server";

import { ErrorCode, isAppError } from "@/lib/errors";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";

export function apiSuccess<T>(
  data: T,
  status = 200,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

export function apiError(
  error: unknown,
  fallbackMessage = "An unexpected error occurred",
): NextResponse<ApiErrorResponse> {
  if (isAppError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: fallbackMessage,
      code: ErrorCode.INTERNAL_ERROR,
      timestamp: new Date().toISOString(),
    },
    { status: 500 },
  );
}
