"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { isAppError } from "@/lib/errors";
import {
  getCurrentSession,
  refreshSession,
  signInWithEmail,
  signOut as signOutService,
  signUpWithEmail,
} from "@/services/auth.service";
import type { AuthUser, SignInInput, SignUpInput } from "@/types/auth";
import type { Database } from "@/types/database";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (input: SignInInput) => Promise<{ user: AuthUser | null }>;
  signUp: (input: SignUpInput) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function createBrowserSupabaseClient(): SupabaseClient<Database> | null {
  if (typeof window === "undefined") {
    return null;
  }

  return createClient();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(createBrowserSupabaseClient);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isMounted = true;

    async function initializeSession() {
      try {
        const session = await getCurrentSession(client);
        if (isMounted) {
          setUser(session?.user ?? null);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setUser(null);
          setError(
            isAppError(err) ? err.message : "Unable to restore session",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initializeSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      void getCurrentSession(client)
        .then((authSession) => {
          setUser(authSession?.user ?? null);
          setIsLoading(false);
        })
        .catch(() => {
          setUser(null);
          setIsLoading(false);
        });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshSession(supabase)
        .then((session) => {
          if (session) {
            setUser(session.user);
          }
        })
        .catch(() => {
          // Session refresh failures are handled on the next protected request.
        });
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [supabase]);

  const signIn = useCallback(
    async (input: SignInInput) => {
      if (!supabase) {
        throw new Error("Authentication client is not ready");
      }

      setIsLoading(true);
      setError(null);

      try {
        const session = await signInWithEmail(supabase, input);
        setUser(session.user);
        return { user: session.user };
      } catch (err) {
        const message = isAppError(err)
          ? err.message
          : "Unable to sign in. Please try again.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      if (!supabase) {
        throw new Error("Authentication client is not ready");
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await signUpWithEmail(supabase, input);

        if (!result.requiresEmailConfirmation) {
          const session = await getCurrentSession(supabase);
          setUser(session?.user ?? null);
        }

        return result;
      } catch (err) {
        const message = isAppError(err)
          ? err.message
          : "Unable to create account. Please try again.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      throw new Error("Authentication client is not ready");
    }

    setIsLoading(true);
    setError(null);

    try {
      await signOutService(supabase);
      setUser(null);
    } catch (err) {
      const message = isAppError(err)
        ? err.message
        : "Unable to sign out. Please try again.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: isLoading || supabase === null,
      isAuthenticated: user !== null,
      error,
      signIn,
      signUp,
      signOut,
      clearError,
    }),
    [clearError, error, isLoading, signIn, signOut, signUp, supabase, user],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
}
