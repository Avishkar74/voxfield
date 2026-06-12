import { Suspense } from "react";

import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      Loading sign-in form...
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-slate-50 px-4 py-10 dark:bg-black">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
