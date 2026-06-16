import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAgentTools } from "../agent-tools";
import { getSystemPrompt } from "../agent-prompt";
import type { AuthenticatedRequestUser } from "@/lib/api/middleware";
import { processVoiceQuery } from "../agent";

const mockCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
    }),
  };
});

describe("Agent Core", () => {
  const techUser: AuthenticatedRequestUser = {
    id: "tech-1",
    email: "tech@test.com",
    role: "TECHNICIAN",
    employeeCode: "T1",
    fullName: "Tech One",
  };

  const supUser: AuthenticatedRequestUser = {
    id: "sup-1",
    email: "sup@test.com",
    role: "SUPERVISOR",
    employeeCode: "S1",
    fullName: "Sup One",
  };

  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // System Prompt
  // ─────────────────────────────────────────────────────────────────────────
  describe("System Prompt Design", () => {
    it("should include the correct role for technicians", () => {
      const prompt = getSystemPrompt(techUser);
      expect(prompt).toContain("Role: TECHNICIAN");
      expect(prompt).toContain("TECHNICIAN");
    });

    it("should include supervisor permissions for supervisors", () => {
      const prompt = getSystemPrompt(supUser);
      expect(prompt).toContain("SUPERVISOR");
    });

    it("should enforce brevity", () => {
      const prompt = getSystemPrompt(techUser);
      expect(prompt).toContain("50 words");
    });

    it("should enforce TTS-safe constraints", () => {
      const prompt = getSystemPrompt(techUser);
      expect(prompt).toContain("NO MARKDOWN");
    });

    it("should include entity extraction guidance", () => {
      const prompt = getSystemPrompt(techUser);
      expect(prompt).toContain("ENTITY EXTRACTION");
    });

    it("should include business language glossary", () => {
      const prompt = getSystemPrompt(techUser);
      expect(prompt).toContain("BUSINESS LANGUAGE GLOSSARY");
    });

    it("should include multi-step orchestration guidance", () => {
      const prompt = getSystemPrompt(techUser);
      expect(prompt).toContain("MULTI-STEP");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tool Definitions
  // ─────────────────────────────────────────────────────────────────────────
  describe("Tool Definitions", () => {
    it("should generate 15 functional tools", () => {
      const tools = getAgentTools(mockSupabase, techUser);
      expect(tools.length).toBe(15);
      const names = tools.map(t => t.function.name);
      // Original tools
      expect(names).toContain("getEquipmentHistory");
      expect(names).toContain("createInspection");
      expect(names).toContain("createWorkOrder");
      expect(names).toContain("updateWorkOrder");
      expect(names).toContain("createAlert");
      expect(names).toContain("executeDatabaseQuery");
      // New tools
      expect(names).toContain("searchEquipment");
      expect(names).toContain("getEquipmentStatus");
      expect(names).toContain("listInspections");
      expect(names).toContain("listWorkOrders");
      expect(names).toContain("getWorkOrder");
      expect(names).toContain("findTechnician");
      expect(names).toContain("listAlerts");
      expect(names).toContain("acknowledgeAlert");
      expect(names).toContain("getDashboardKPIs");
    });

    it("createInspection should require severity and equipmentIdentifier", () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "createInspection")!;
      expect(t.function.parameters?.required).toContain("severity");
      expect(t.function.parameters?.required).toContain("equipmentIdentifier");
    });

    it("createWorkOrder should require priority and equipmentIdentifier", () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "createWorkOrder")!;
      expect(t.function.parameters?.required).toContain("priority");
      expect(t.function.parameters?.required).toContain("equipmentIdentifier");
    });

    it("createWorkOrder should accept assignToName instead of UUID", () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "createWorkOrder")!;
      expect(t.function.parameters?.properties).toHaveProperty("assignToName");
      expect(t.function.parameters?.properties).not.toHaveProperty("assignedTo");
    });

    it("getEquipmentHistory should support from/to/failureType/summarise params", () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "getEquipmentHistory")!;
      const props = t.function.parameters?.properties;
      expect(props).toHaveProperty("from");
      expect(props).toHaveProperty("to");
      expect(props).toHaveProperty("failureType");
      expect(props).toHaveProperty("summarise");
      expect(props).toHaveProperty("equipmentIdentifier");
    });

    it("searchEquipment should accept query, location, status, limit", () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "searchEquipment")!;
      const props = t.function.parameters?.properties;
      expect(props).toHaveProperty("query");
      expect(props).toHaveProperty("location");
      expect(props).toHaveProperty("status");
      expect(t.function.parameters?.required).toContain("query");
    });

    it("listWorkOrders should support myOrdersOnly param", () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "listWorkOrders")!;
      expect(t.function.parameters?.properties).toHaveProperty("myOrdersOnly");
    });

    it("executeDatabaseQuery should require both query and context", () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "executeDatabaseQuery")!;
      expect(t.function.parameters?.required).toContain("query");
      expect(t.function.parameters?.required).toContain("context");
    });

    // ── executeDatabaseQuery security ──────────────────────────────────────
    it("should block DROP TABLE in executeDatabaseQuery", async () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "executeDatabaseQuery")!;
      const res = await (t.function as any).function({ query: "DROP TABLE users", context: "test" });
      const parsed = JSON.parse(res);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("SECURITY ERROR");
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it("should block information_schema access in executeDatabaseQuery", async () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "executeDatabaseQuery")!;
      const res = await (t.function as any).function({
        query: "SELECT * FROM information_schema.tables",
        context: "listing tables",
      });
      const parsed = JSON.parse(res);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("SECURITY ERROR");
    });

    it("should inject LIMIT 100 if missing and call rpc", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [{ count: 5 }], error: null });
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "executeDatabaseQuery")!;
      const res = await (t.function as any).function({
        query: "SELECT count(*) FROM work_orders",
        context: "counting WOs",
      });
      const parsed = JSON.parse(res);
      expect(parsed.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("execute_read_only_sql", {
        query: "SELECT count(*) FROM work_orders LIMIT 100",
      });
    });

    it("should not double-inject LIMIT if already present", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "executeDatabaseQuery")!;
      await (t.function as any).function({
        query: "SELECT * FROM equipment LIMIT 5",
        context: "small equipment list",
      });
      const callArg = mockSupabase.rpc.mock.calls[0][1].query as string;
      // Should not contain two LIMIT clauses
      const limitMatches = callArg.match(/limit/gi);
      expect(limitMatches?.length).toBe(1);
    });

    // ── acknowledgeAlert role check ─────────────────────────────────────────
    it("acknowledgeAlert should deny TECHNICIAN role", async () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "acknowledgeAlert")!;
      const res = await (t.function as any).function({ alertId: "abc", action: "ACKNOWLEDGE" });
      const parsed = JSON.parse(res);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Permission denied");
    });

    // ── getDashboardKPIs role check ─────────────────────────────────────────
    it("getDashboardKPIs should deny TECHNICIAN role", async () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "getDashboardKPIs")!;
      const res = await (t.function as any).function({});
      const parsed = JSON.parse(res);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Permission denied");
    });

    // ── response envelope ───────────────────────────────────────────────────
    it("tool responses should follow { success, data, summary, error } envelope", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      const tools = getAgentTools(mockSupabase, techUser);
      const t = tools.find(t => t.function.name === "executeDatabaseQuery")!;
      const res = await (t.function as any).function({
        query: "SELECT 1",
        context: "sanity check",
      });
      const parsed = JSON.parse(res);
      expect(parsed).toHaveProperty("success");
      expect(parsed).toHaveProperty("data");
      expect(parsed).toHaveProperty("summary");
      expect(parsed).toHaveProperty("error");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// processVoiceQuery integration tests
// ─────────────────────────────────────────────────────────────────────────────
describe("processVoiceQuery integration", () => {
  const techUser: AuthenticatedRequestUser = {
    id: "tech-1",
    email: "tech@test.com",
    role: "TECHNICIAN",
    employeeCode: "T1",
    fullName: "Tech One",
  };

  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    };
    vi.clearAllMocks();
  });

  it("should process plain query without tool calls", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "Hello! I am your VoxField AI assistant. How can I help?",
          },
        },
      ],
    });

    mockSupabase.rpc.mockResolvedValueOnce({
      data: { transcriptId: "t-123", sessionId: "s-123" },
      error: null,
    });

    const result = await processVoiceQuery(mockSupabase, techUser, "hello there");

    expect(result.agentResponse).toBe("Hello! I am your VoxField AI assistant. How can I help?");
    expect(result.toolsUsed).toEqual([]);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("create_voice_transcript_tx", {
      p_user_id: "tech-1",
      p_user_prompt: "hello there",
      p_session_id: expect.any(String),
      p_tools_used: [],
    });
  });

  it("should execute a tool call and iterate back to return final answer", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            tool_calls: [
              {
                id: "call-xyz",
                type: "function",
                function: {
                  name: "getEquipmentHistory",
                  arguments: '{"equipmentIdentifier":"AC-101"}',
                },
              },
            ],
          },
        },
      ],
    });

    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "AC-101 has a history of compressor repair on June 15.",
          },
        },
      ],
    });

    // resolveEquipment → ilike on equipment_code
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "eq-abc", equipment_code: "AC-101", name: "Air Conditioner", location: "Roof", status: "ACTIVE" },
        error: null,
      }),
      limit: vi.fn().mockResolvedValue({
        data: [{ repair_date: "2023-06-15", failure_type: "Compressor failure" }],
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    mockSupabase.rpc.mockResolvedValueOnce({
      data: { transcriptId: "t-123", sessionId: "s-123" },
      error: null,
    });

    const result = await processVoiceQuery(mockSupabase, techUser, "history of AC-101");

    expect(result.agentResponse).toBe("AC-101 has a history of compressor repair on June 15.");
    expect(result.toolsUsed).toContain("getEquipmentHistory");
  });

  it("should handle tool execution failure gracefully", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            tool_calls: [
              {
                id: "call-err",
                type: "function",
                function: {
                  name: "getEquipmentHistory",
                  arguments: '{"equipmentIdentifier":"eq-abc"}',
                },
              },
            ],
          },
        },
      ],
    });

    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "Sorry, I encountered an error checking the history.",
          },
        },
      ],
    });

    // Simulate equipment not found
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    mockSupabase.rpc.mockResolvedValueOnce({
      data: { transcriptId: "t-123", sessionId: "s-123" },
      error: null,
    });

    const result = await processVoiceQuery(mockSupabase, techUser, "history of AC-101");
    expect(result.agentResponse).toBe("Sorry, I encountered an error checking the history.");
    expect(result.toolsUsed).toContain("getEquipmentHistory");
  });

  it("should retrieve rolling session memory history and append it to openai chat messages context", async () => {
    const pastTranscripts = [
      { user_prompt: "First user message", agent_response: "First agent response" },
      { user_prompt: "Second user message", agent_response: "Second agent response" }
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue({ data: pastTranscripts, error: null });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
    });

    mockSupabase.rpc.mockResolvedValueOnce({
      data: { transcriptId: "t-123", sessionId: "s-123" },
      error: null,
    });

    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "Response with memory context.",
          },
        },
      ],
    });

    const result = await processVoiceQuery(mockSupabase, techUser, "Third user message", "active-session-id");

    expect(result.agentResponse).toBe("Response with memory context.");
    expect(mockSupabase.from).toHaveBeenCalledWith("transcripts");
    expect(mockEq).toHaveBeenCalledWith("session_id", "active-session-id");
    
    // Verify that the mocked OpenAI call was invoked with the prepended messages
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "user", content: "First user message" }),
        expect.objectContaining({ role: "assistant", content: "First agent response" }),
        expect.objectContaining({ role: "user", content: "Second user message" }),
        expect.objectContaining({ role: "assistant", content: "Second agent response" }),
        expect.objectContaining({ role: "user", content: "Third user message" }),
      ]),
    }));
  });
});
