import { withApiHandler } from "@/lib/api/handler";
import { parseJsonBody } from "@/lib/api/request";
import { apiSuccess } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { signUpSchema } from "@/lib/validation";
import { ValidationError } from "@/lib/errors";

export const POST = withApiHandler(
  async (request) => {
    const body = await parseJsonBody(request);
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const { email, password, fullName, employeeCode, role } = parsed.data;

    const adminClient = createAdminClient();

    // Register user via admin API with email_confirm: true (bypassing verification)
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        employee_code: employeeCode,
        role,
      },
    });

    if (error) {
      throw new ValidationError(error.message);
    }

    return apiSuccess({
      requiresEmailConfirmation: false,
    }, 201);
  },
  { auth: false }
);
