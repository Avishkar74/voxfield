"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/hooks/use-auth";
import { signInSchema, signUpSchema } from "@/lib/validation";
import type { UserRole } from "@/types/database";

type AuthMode = "sign-in" | "sign-up";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, isLoading, error, clearError } = useAuth();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [role, setRole] = useState<UserRole>("TECHNICIAN");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    clearError();

    const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

    try {
      if (mode === "sign-in") {
        const parsed = signInSchema.safeParse({ email, password });

        if (!parsed.success) {
          setFormError(parsed.error.issues[0]?.message ?? "Invalid input");
          return;
        }

        await signIn(parsed.data);
        router.replace(redirectTo);
        return;
      }

      const parsed = signUpSchema.safeParse({
        email,
        password,
        fullName,
        employeeCode,
        role,
      });

      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? "Invalid input");
        return;
      }

      const result = await signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        fullName: parsed.data.fullName,
        employeeCode: parsed.data.employeeCode,
        role: parsed.data.role,
      });

      if (result.requiresEmailConfirmation) {
        setSuccessMessage(
          "Account created. Check your email to confirm your address before signing in.",
        );
        setMode("sign-in");
        return;
      }

      router.replace(redirectTo);
    } catch {
      // AuthContext already stores the error message.
    }
  }

  const displayedError = formError ?? error;

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
      <div className="mb-6 space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          VoxField AI
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Voice-first assistant for field service operations.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            mode === "sign-in"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
              : "text-slate-600 dark:text-slate-400"
          }`}
          onClick={() => {
            setMode("sign-in");
            setFormError(null);
            setSuccessMessage(null);
            clearError();
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            mode === "sign-up"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
              : "text-slate-600 dark:text-slate-400"
          }`}
          onClick={() => {
            setMode("sign-up");
            setFormError(null);
            setSuccessMessage(null);
            clearError();
          }}
        >
          Sign up
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {mode === "sign-up" ? (
          <>
            <Input
              label="Full name"
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
            <Input
              label="Employee code"
              name="employeeCode"
              autoComplete="off"
              value={employeeCode}
              onChange={(event) =>
                setEmployeeCode(event.target.value.toUpperCase())
              }
              placeholder="TECH001"
              required
            />
            <Select
              label="Role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              options={[
                { label: "Technician", value: "TECHNICIAN" },
                { label: "Supervisor", value: "SUPERVISOR" },
              ]}
            />
          </>
        ) : null}

        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete={
            mode === "sign-in" ? "current-password" : "new-password"
          }
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {displayedError ? <Alert message={displayedError} variant="error" /> : null}
        {successMessage ? (
          <Alert message={successMessage} variant="success" />
        ) : null}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
