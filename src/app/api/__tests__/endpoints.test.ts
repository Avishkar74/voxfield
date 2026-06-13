import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST as createInspection } from "@/app/api/inspections/create/route";
import { POST as createWorkOrder } from "@/app/api/work-orders/create/route";
import { PATCH as updateWorkOrder } from "@/app/api/work-orders/[id]/route";
import { GET as getEquipmentHistory } from "@/app/api/equipment/[id]/history/route";
import { POST as voiceQuery } from "@/app/api/voice-query/route";
import { POST as syncQueue } from "@/app/api/sync-offline-queue/route";
import { GET as techDashboard } from "@/app/api/dashboard/technician/route";
import { GET as supDashboard } from "@/app/api/dashboard/supervisor/route";
import { POST as sttEndpoint } from "@/app/api/stt/route";
import { POST as ttsEndpoint } from "@/app/api/tts/route";
import { requireAuth } from "@/lib/api/middleware";

const { mockTranscribe, mockSpeechCreate } = vi.hoisted(() => ({
  mockTranscribe: vi.fn(),
  mockSpeechCreate: vi.fn(),
}));

vi.mock("assemblyai", () => {
  return {
    AssemblyAI: vi.fn().mockImplementation(() => ({
      transcripts: {
        transcribe: mockTranscribe,
      },
    })),
  };
});

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      audio: {
        speech: {
          create: mockSpeechCreate,
        },
      },
    })),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/services/phase2.service", () => ({
  createInspection: vi.fn(),
  createWorkOrder: vi.fn(),
  updateWorkOrder: vi.fn(),
  getEquipmentHistory: vi.fn(),
  createVoiceTranscript: vi.fn(),
  processOfflineQueue: vi.fn(),
  getTechnicianDashboard: vi.fn(),
  getSupervisorDashboard: vi.fn(),
}));

vi.mock("@/lib/agent", () => ({
  processVoiceQuery: vi.fn(),
}));

vi.mock("@/lib/api/middleware", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/middleware")>();
  return {
    ...actual,
    requireAuth: vi.fn().mockResolvedValue({
      id: "user-1",
      role: "TECHNICIAN",
      email: "test@test.com",
    }),
  };
});


describe("API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-1",
      role: "TECHNICIAN",
      email: "test@test.com",
    } as any);
  });

  const createRequest = (body?: any, url = "http://localhost/api") => {
    return new NextRequest(url, {
      method: body ? "POST" : "GET",
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  it("POST /api/inspections/create", async () => {
    const { createInspection: mockService } = await import("@/services/phase2.service");
    vi.mocked(mockService).mockResolvedValue({ inspection: { id: "1" } as any, alertCreated: false });

    const req = createRequest({ equipmentId: "00000000-0000-0000-0000-000000000000", title: "Test", description: "Desc", severity: "LOW" });
    const res = await createInspection(req, {});
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.inspection.id).toBe("1");
  });

  it("POST /api/work-orders/create", async () => {
    const { createWorkOrder: mockService } = await import("@/services/phase2.service");
    vi.mocked(mockService).mockResolvedValue({ workOrder: { id: "2" } as any });

    const req = createRequest({ equipmentId: "00000000-0000-0000-0000-000000000000", title: "Test", description: "Desc", priority: "LOW" });
    const res = await createWorkOrder(req, {});
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.workOrder.id).toBe("2");
  });

  it("PATCH /api/work-orders/[id]", async () => {
    const { updateWorkOrder: mockService } = await import("@/services/phase2.service");
    vi.mocked(mockService).mockResolvedValue({ workOrder: { id: "3" } as any, previousStatus: "OPEN" });

    const req = new NextRequest("http://localhost/api", { method: "PATCH", body: JSON.stringify({ status: "CLOSED" }) });
    const res = await updateWorkOrder(req, { params: Promise.resolve({ id: "wo-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.workOrder.id).toBe("3");
  });

  it("GET /api/equipment/[id]/history", async () => {
    const { getEquipmentHistory: mockService } = await import("@/services/phase2.service");
    vi.mocked(mockService).mockResolvedValue({ equipmentId: "00000000-0000-0000-0000-000000000000", count: 0, items: [] });

    const req = createRequest(undefined, "http://localhost/api?limit=5");
    const res = await getEquipmentHistory(req, { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.equipmentId).toBe("00000000-0000-0000-0000-000000000000");
  });

  it("POST /api/voice-query", async () => {
    const { processVoiceQuery: mockService } = await import("@/lib/agent");
    vi.mocked(mockService).mockResolvedValue({ agentResponse: "hi", transcriptId: "1", sessionId: "s", toolsUsed: [] });

    const req = createRequest({ userPrompt: "hello" });
    const res = await voiceQuery(req, {});
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.agentResponse).toBe("hi");
  });

  it("POST /api/sync-offline-queue", async () => {
    const { processOfflineQueue: mockService } = await import("@/services/phase2.service");
    vi.mocked(mockService).mockResolvedValue({ processed: 1, failed: 0, skipped: 0, message: "ok" });

    const req = createRequest({ items: [] });
    const res = await syncQueue(req, {});
    expect(res.status).toBe(200);
  });

  it("GET /api/dashboard/technician", async () => {
    const { getTechnicianDashboard: mockService } = await import("@/services/phase2.service");
    vi.mocked(mockService).mockResolvedValue({ user: {} as any, counts: {} as any, workOrders: [], inspections: [], transcripts: [], activityLogs: [] });

    const req = createRequest();
    const res = await techDashboard(req, {});
    expect(res.status).toBe(200);
  });

  it("GET /api/dashboard/supervisor throws if not supervisor", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "1", role: "TECHNICIAN" } as any);

    const req = createRequest();
    const res = await supDashboard(req, {});
    expect(res.status).toBe(403);
  });

  it("GET /api/dashboard/supervisor returns 200 for supervisor", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "1", role: "SUPERVISOR" } as any);
    const { getSupervisorDashboard: mockService } = await import("@/services/phase2.service");
    vi.mocked(mockService).mockResolvedValue({ user: {} as any, counts: {} as any, workOrders: [], inspections: [], alerts: [], transcripts: [], activityLogs: [] });

    const req = createRequest();
    const res = await supDashboard(req, {});
    expect(res.status).toBe(200);
  });

  it("POST /api/stt returns transcribed text", async () => {
    mockTranscribe.mockResolvedValueOnce({
      status: "completed",
      text: "Turn off generator 1",
      confidence: 0.95,
    });

    const formData = new FormData();
    formData.append("audio", new Blob(["audio content"], { type: "audio/webm" }));

    const req = new NextRequest("http://localhost/api/stt", {
      method: "POST",
      body: formData,
    });

    const res = await sttEndpoint(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.text).toBe("Turn off generator 1");
    expect(json.confidence).toBe(0.95);
  });

  it("POST /api/tts returns mpeg audio buffer", async () => {
    mockSpeechCreate.mockResolvedValueOnce({
      arrayBuffer: async () => new ArrayBuffer(10),
    });

    const req = new NextRequest("http://localhost/api/tts", {
      method: "POST",
      body: JSON.stringify({ text: "Hello supervisor" }),
    });

    const res = await ttsEndpoint(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
  });
});

