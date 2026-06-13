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

  describe("System Prompt Design", () => {
    it("should include the correct role for technicians", () => {
      const prompt = getSystemPrompt(techUser);
      expect(prompt).toContain("Role: TECHNICIAN");
      expect(prompt).toContain("create inspections");
    });

    it("should include the correct role for supervisors", () => {
      const prompt = getSystemPrompt(supUser);
      expect(prompt).toContain("Role: SUPERVISOR");
      expect(prompt).toContain("elevated access");
    });

    it("should enforce brevity", () => {
      const prompt = getSystemPrompt(techUser);
      expect(prompt).toContain("strictly under 50 words");
    });

    it("should enforce TTS-safe constraints", () => {
      const prompt = getSystemPrompt(techUser);
      expect(prompt).toContain("NO MARKDOWN");
    });
  });

  describe("Tool Definitions", () => {
    it("should generate 6 functional tools", () => {
      const tools = getAgentTools(mockSupabase, techUser);
      expect(tools.length).toBe(6);
      const names = tools.map(t => t.function.name);
      expect(names).toContain("getEquipmentHistory");
      expect(names).toContain("createInspection");
      expect(names).toContain("createWorkOrder");
      expect(names).toContain("updateWorkOrder");
      expect(names).toContain("createAlert");
      expect(names).toContain("executeDatabaseQuery");
    });

    it("should have correct schema for createInspection", () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const inspectionTool = tools.find(t => t.function.name === "createInspection")!;
      expect(inspectionTool.function.parameters?.required).toContain("severity");
    });

    it("should have correct schema for createWorkOrder", () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const woTool = tools.find(t => t.function.name === "createWorkOrder")!;
      expect(woTool.function.parameters?.required).toContain("priority");
    });

    it("should execute executeDatabaseQuery with valid select query", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [{ count: 5 }], error: null });
      const tools = getAgentTools(mockSupabase, techUser);
      const tool = tools.find(t => t.function.name === "executeDatabaseQuery")!;
      const res = await (tool.function as any).function({ query: "SELECT count(*) FROM work_orders" });
      expect(res).toContain("count");
      expect(mockSupabase.rpc).toHaveBeenCalledWith("execute_read_only_sql", { query: "SELECT count(*) FROM work_orders" });
    });

    it("should block write queries in executeDatabaseQuery", async () => {
      const tools = getAgentTools(mockSupabase, techUser);
      const tool = tools.find(t => t.function.name === "executeDatabaseQuery")!;
      const res = await (tool.function as any).function({ query: "DROP TABLE users" });
      expect(res).toContain("SECURITY ERROR");
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it("should execute getEquipmentHistory without crashing", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      const tools = getAgentTools(mockSupabase, techUser);
      const historyTool = tools.find(t => t.function.name === "getEquipmentHistory")!;
      const res = await (historyTool.function as any).function({ equipmentId: "test-eq" });
      expect(typeof res).toBe("string");
    });

    it("should execute createInspection without crashing", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { inspection: {}, alertCreated: false }, error: null });
      const tools = getAgentTools(mockSupabase, techUser);
      const tool = tools.find(t => t.function.name === "createInspection")!;
      const res = await (tool.function as any).function({ equipmentId: "eq1", title: "Test", description: "Test", severity: "LOW" });
      expect(typeof res).toBe("string");
    });
  });
});

// Real Integration Tests for processVoiceQuery
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

    const result = await processVoiceQuery(
      mockSupabase,
      techUser,
      "hello there"
    );

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
    // 1st LLM call yields a tool call to getEquipmentHistory
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
                  arguments: '{"equipmentId":"eq-abc"}',
                },
              },
            ],
          },
        },
      ],
    });

    // 2nd LLM call yields the final response text
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "AC-101 has a history of compressor repair on June 15.",
          },
        },
      ],
    });

    // Mock getEquipmentHistory Supabase call
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ repair_date: "2023-06-15", failure_type: "Compressor failure" }],
        error: null,
      }),
    });

    // Mock voice transcript save
    mockSupabase.rpc.mockResolvedValueOnce({
      data: { transcriptId: "t-123", sessionId: "s-123" },
      error: null,
    });

    const result = await processVoiceQuery(
      mockSupabase,
      techUser,
      "history of AC-101"
    );

    expect(result.agentResponse).toBe("AC-101 has a history of compressor repair on June 15.");
    expect(result.toolsUsed).toContain("getEquipmentHistory");
    expect(mockSupabase.rpc).toHaveBeenCalledWith("create_voice_transcript_tx", {
      p_user_id: "tech-1",
      p_user_prompt: "history of AC-101",
      p_session_id: expect.any(String),
      p_tools_used: ["getEquipmentHistory"],
    });
  });

  it("should handle tool execution failure gracefully", async () => {
    // 1st LLM call yields a tool call to getEquipmentHistory
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
                  arguments: '{"equipmentId":"eq-abc"}',
                },
              },
            ],
          },
        },
      ],
    });

    // 2nd LLM call yields final text
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "Sorry, I encountered an error checking the history.",
          },
        },
      ],
    });

    // Simulate database failure for getEquipmentHistory
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("DB Connection Lost"),
      }),
    });

    mockSupabase.rpc.mockResolvedValueOnce({
      data: { transcriptId: "t-123", sessionId: "s-123" },
      error: null,
    });

    const result = await processVoiceQuery(
      mockSupabase,
      techUser,
      "history of AC-101"
    );

    expect(result.agentResponse).toBe("Sorry, I encountered an error checking the history.");
    expect(result.toolsUsed).toContain("getEquipmentHistory");
  });
});

