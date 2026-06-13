import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  signUpWithEmail,
  signInWithEmail,
  signOut,
  getCurrentSession,
  refreshSession,
} from "../auth.service";

describe("Auth Service", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn(),
        getUser: vi.fn(),
        refreshSession: vi.fn(),
      },
      from: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe("signUpWithEmail", () => {
    it("should validate input and sign up user", async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: "user-123" }, session: null },
        error: null,
      });

      const result = await signUpWithEmail(mockSupabase, {
        email: "tech@test.com",
        password: "password123",
        fullName: "John Tech",
        employeeCode: "T-01",
        role: "TECHNICIAN",
      });

      expect(result.requiresEmailConfirmation).toBe(true);
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "tech@test.com",
        password: "password123",
        options: {
          data: {
            full_name: "John Tech",
            employee_code: "T-01",
            role: "TECHNICIAN",
          },
        },
      });
    });

    it("should throw error for invalid email", async () => {
      await expect(
        signUpWithEmail(mockSupabase, {
          email: "invalid-email",
          password: "password123",
          fullName: "John Tech",
          employeeCode: "T-01",
          role: "TECHNICIAN",
        })
      ).rejects.toThrow("Enter a valid email address");
    });
  });

  describe("signInWithEmail", () => {
    it("should validate and sign in user, fetching profile", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          session: { access_token: "token" },
          user: { id: "user-123", email: "tech@test.com" },
        },
        error: null,
      });

      // Mock profile fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: {
            id: "user-123",
            email: "tech@test.com",
            full_name: "John Tech",
            employee_code: "T-01",
            role: "TECHNICIAN",
          },
          error: null,
        }),
      });

      const result = await signInWithEmail(mockSupabase, {
        email: "tech@test.com",
        password: "password123",
      });

      expect(result.session.access_token).toBe("token");
      expect(result.user.role).toBe("TECHNICIAN");
    });
  });

  describe("signOut", () => {
    it("should sign out user", async () => {
      mockSupabase.auth.signOut.mockResolvedValueOnce({ error: null });
      await expect(signOut(mockSupabase)).resolves.not.toThrow();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe("getCurrentSession", () => {
    it("should return null if no session exists", async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const result = await getCurrentSession(mockSupabase);
      expect(result).toBeNull();
    });

    it("should return auth session with profile", async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: "token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: {
            id: "user-123",
            email: "tech@test.com",
            full_name: "John Tech",
            employee_code: "T-01",
            role: "TECHNICIAN",
          },
          error: null,
        }),
      });

      const result = await getCurrentSession(mockSupabase);
      expect(result).toBeDefined();
      expect(result?.session.access_token).toBe("token");
      expect(result?.user.full_name).toBe("John Tech");
    });
  });

  describe("refreshSession", () => {
    it("should refresh and return session with profile", async () => {
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: {
          session: { access_token: "refreshed-token" },
          user: { id: "user-123" },
        },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: {
            id: "user-123",
            email: "tech@test.com",
            full_name: "John Tech",
            employee_code: "T-01",
            role: "TECHNICIAN",
          },
          error: null,
        }),
      });

      const result = await refreshSession(mockSupabase);
      expect(result).toBeDefined();
      expect(result?.session.access_token).toBe("refreshed-token");
    });
  });
});
