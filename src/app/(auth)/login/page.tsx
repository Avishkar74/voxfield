import { Suspense } from "react";

import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-[#E5E1D8] bg-white p-8 text-center text-sm text-[#57534E]">
      Loading sign-in form...
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[#FAF9F5] px-4 py-10">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
