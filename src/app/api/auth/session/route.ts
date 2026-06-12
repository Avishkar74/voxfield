import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import type { SessionResponse } from "@/types/api";

export const GET = withApiHandler(
  async (_request, { user }) => {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const data: SessionResponse = {
      user: {
        id: user!.id,
        email: user!.email,
        fullName: user!.fullName,
        employeeCode: user!.employeeCode,
        role: user!.role,
      },
      expiresAt: session?.expires_at ?? null,
    };

    return apiSuccess(data);
  },
  { auth: true },
);
