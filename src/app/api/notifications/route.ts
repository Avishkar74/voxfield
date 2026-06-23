import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export const GET = withApiHandler(
  async (_request, { user }) => {
    const supabase = await createClient();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const role = String(
      (user as any).role ??
      (user as any).user_role ??
      ""
    ).toUpperCase();

    // SUPERVISOR NOTIFICATIONS
    if (role.includes("SUPERVISOR")) {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        throw new Error(error.message);
      }

      const notifications = (data ?? []).map((alert: any) => ({
        id: alert.id,
        type: "ALERT",
        severity: alert.severity,
        message: alert.message,
        targetUrl: "/supervisor#alerts",
        read: false,
        createdAt: alert.created_at,
      }));

      return apiSuccess(notifications);
    }

    // TECHNICIAN NOTIFICATIONS
    const { data, error } = await supabase
      .from("work_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(error.message);
    }

    const notifications = (data ?? []).map((wo: any) => ({
      id: wo.id,
      type: "WORK_ORDER",
      severity: wo.priority ?? "MEDIUM",
      message: `Work order ${wo.work_order_number ?? wo.id} assigned`,
      targetUrl: "/technician/work-orders",
      read: false,
      createdAt: wo.created_at,
    }));

    return apiSuccess(notifications);
  },
  {
    auth: true,
  }
);