import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canAdvanceWorkOrderStatus, workOrderStatusSchema } from "@/lib/phase2";
import {
  getEquipmentHistory,
  createInspection,
  createWorkOrder,
  updateWorkOrder,
  createVoiceTranscript,
  processOfflineQueue,
  getTechnicianDashboard,
  getSupervisorDashboard,
} from "./phase2.service";
import { ValidationError, ForbiddenError } from "@/lib/errors";
import type { AuthenticatedRequestUser } from "@/lib/api/middleware";

vi.mock("@/lib/agent", () => ({
  processVoiceQuery: vi.fn().mockResolvedValue({ agentResponse: "Mock response" }),
}));

describe("phase2 helpers", () => {
  it("allows forward work order transitions", () => {
    expect(canAdvanceWorkOrderStatus("OPEN", "IN_PROGRESS")).toBe(true);
    expect(canAdvanceWorkOrderStatus("IN_PROGRESS", "CLOSED")).toBe(true);
  });

  it("rejects backward work order transitions", () => {
    expect(canAdvanceWorkOrderStatus("CLOSED", "OPEN")).toBe(false);
  });

  it("accepts valid work order statuses", () => {
    expect(workOrderStatusSchema.safeParse("OPEN").success).toBe(true);
    expect(workOrderStatusSchema.safeParse("PAUSED").success).toBe(false);
  });
});

function createMockSupabase() {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const supabase = {
    from: mockFrom,
    rpc: mockRpc,
  } as unknown as SupabaseClient<any>;
  return { supabase, mockFrom, mockRpc };
}

const techUser: AuthenticatedRequestUser = {
  id: "user-1",
  email: "tech@test.com",
  role: "TECHNICIAN",
  employeeCode: "TECH-1",
  fullName: "Technician User",
};

const supUser: AuthenticatedRequestUser = {
  id: "user-2",
  email: "sup@test.com",
  role: "SUPERVISOR",
  employeeCode: "SUP-1",
  fullName: "Supervisor User",
};

describe("getEquipmentHistory", () => {
  it("returns parsed equipment history", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const limit = vi.fn().mockResolvedValue({ data: [{ id: "repair-1" }], error: null });
    const order2 = vi.fn().mockReturnValue({ limit });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    const eq = vi.fn().mockReturnValue({ order: order1 });
    const select = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await getEquipmentHistory(supabase, { equipmentId: "00000000-0000-0000-0000-000000000000", limit: 10 });
    expect(result.count).toBe(1);
    expect(result.items[0].id).toBe("repair-1");
  });

  it("throws ValidationError on invalid input", async () => {
    const { supabase } = createMockSupabase();
    await expect(getEquipmentHistory(supabase, { equipmentId: "", limit: 10 })).rejects.toThrow(ValidationError);
  });
});

describe("createInspection", () => {
  it("calls create_inspection_tx RPC for technicians", async () => {
    const { supabase, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({
      data: { inspection: { id: "insp-1" }, alertCreated: true },
      error: null,
    });

    const result = await createInspection(supabase, techUser, {
      equipmentId: "00000000-0000-0000-0000-000000000000",
      title: "Test",
      description: "Test Desc",
      severity: "CRITICAL",
    });

    expect(result.alertCreated).toBe(true);
    expect(result.inspection.id).toBe("insp-1");
    expect(mockRpc).toHaveBeenCalledWith("create_inspection_tx", expect.any(Object));
  });

  it("throws ForbiddenError for non-technicians", async () => {
    const { supabase } = createMockSupabase();
    await expect(createInspection(supabase, supUser, {
      equipmentId: "00000000-0000-0000-0000-000000000000",
      title: "Test",
      description: "Test Desc",
      severity: "CRITICAL",
    })).rejects.toThrow(ForbiddenError);
  });
});

describe("createWorkOrder", () => {
  it("calls create_work_order_tx RPC for technicians", async () => {
    const { supabase, mockRpc, mockFrom } = createMockSupabase();
    
    // Mock user exists check
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: techUser.id }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    mockRpc.mockResolvedValue({
      data: { workOrder: { id: "wo-1" } },
      error: null,
    });

    const result = await createWorkOrder(supabase, techUser, {
      equipmentId: "00000000-0000-0000-0000-000000000000",
      title: "Test",
      description: "Test Desc",
      priority: "HIGH",
    });

    expect(result.workOrder.id).toBe("wo-1");
    expect(mockRpc).toHaveBeenCalledWith("create_work_order_tx", expect.any(Object));
  });
});

describe("updateWorkOrder", () => {
  it("calls update_work_order_tx RPC", async () => {
    const { supabase, mockRpc, mockFrom } = createMockSupabase();

    // Mock existing work order
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "00000000-0000-0000-0000-000000000000", status: "OPEN", created_by: techUser.id }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    mockRpc.mockResolvedValue({
      data: { workOrder: { id: "wo-1", status: "IN_PROGRESS" }, previousStatus: "OPEN" },
      error: null,
    });

    const result = await updateWorkOrder(supabase, techUser, "00000000-0000-0000-0000-000000000000", {
      status: "IN_PROGRESS",
    });

    expect(result.previousStatus).toBe("OPEN");
    expect(result.workOrder.status).toBe("IN_PROGRESS");
    expect(mockRpc).toHaveBeenCalledWith("update_work_order_tx", expect.any(Object));
  });
});

describe("createVoiceTranscript", () => {
  it("calls create_voice_transcript_tx RPC", async () => {
    const { supabase, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({
      data: { placeholder: true, agentResponse: "Test", transcriptId: "trans-1", sessionId: "sess-1" },
      error: null,
    });

    const result = await createVoiceTranscript(supabase, techUser, {
      userPrompt: "Hello",
    });

    expect(result.placeholder).toBe(true);
    expect(result.transcriptId).toBe("trans-1");
  });
});

describe("processOfflineQueue", () => {
  it("processes offline queue operations", async () => {
    const { supabase, mockRpc, mockFrom } = createMockSupabase();

    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "user-1" }, error: null });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockRpc.mockImplementation((name) => {
      if (name === "create_inspection_tx") {
        return Promise.resolve({ data: { inspection: { id: "ins-1" }, alertCreated: false }, error: null });
      }
      if (name === "create_work_order_tx") {
        return Promise.resolve({ data: { workOrder: { id: "wo-1" } }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const result = await processOfflineQueue(supabase, techUser, {
      items: [
        {
          id: "item-1",
          operation: "create-inspection",
          payload: { equipmentId: "00000000-0000-0000-0000-000000000000", title: "Inspection 1", severity: "LOW", description: "All good" },
          queuedAt: "2026-06-13T00:00:00Z",
        },
        {
          id: "item-2",
          operation: "create-work-order",
          payload: { equipmentId: "00000000-0000-0000-0000-000000000000", title: "WO 1", priority: "MEDIUM", description: "Fix leak" },
          queuedAt: "2026-06-13T00:00:00Z",
        },
        {
          id: "item-3",
          operation: "invalid-op",
          payload: {},
          queuedAt: "2026-06-13T00:00:00Z",
        },
      ],
    });

    expect(result.processed).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("handles operation execution errors gracefully", async () => {
    const { supabase, mockRpc, mockFrom } = createMockSupabase();

    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "user-1" }, error: null });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockRpc.mockResolvedValue({ data: null, error: { message: "DB Error" } });

    const result = await processOfflineQueue(supabase, techUser, {
      items: [
        {
          id: "item-1",
          operation: "create-inspection",
          payload: { equipmentId: "00000000-0000-0000-0000-000000000000", title: "Inspection 1", severity: "LOW", description: "All good" },
          queuedAt: "2026-06-13T00:00:00Z",
        },
      ],
    });

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
  });
});

describe("dashboards", () => {
  it("technician dashboard fetches relevant data", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const orEq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ or: orEq, eq: orEq });
    mockFrom.mockReturnValue({ select });

    const result = await getTechnicianDashboard(supabase, techUser);
    expect(result.counts.workOrders).toBe(0);
  });

  it("supervisor dashboard fetches relevant data", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ order });
    mockFrom.mockReturnValue({ select });

    const result = await getSupervisorDashboard(supabase, supUser);
    expect(result.counts.workOrders).toBe(0);
  });
});