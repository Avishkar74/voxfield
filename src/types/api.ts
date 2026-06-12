import type { ErrorCode } from "@/lib/errors";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface HealthResponse {
  status: "ok";
  environment: string;
  appName: string;
}

export interface SessionResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    employeeCode: string;
    role: string;
  };
  expiresAt: number | null;
}
