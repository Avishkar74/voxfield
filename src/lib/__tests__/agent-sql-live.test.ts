import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { describe, expect, it } from "vitest";
import { createAdminClient } from "../supabase/admin";
import { processVoiceQuery } from "../agent";
import type { AuthenticatedRequestUser } from "@/lib/api/middleware";

const hasEnvVars = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.OPENAI_API_KEY
);

describe.runIf(hasEnvVars)("Agent Text-to-SQL Live Integration", () => {
  const adminUser: AuthenticatedRequestUser = {
    id: "11111111-1111-1111-1111-111111111111", // john doe tech
    email: "tech@voxfield.com",
    role: "TECHNICIAN",
    employeeCode: "TECH-001",
    fullName: "John Doe",
  };

  // We only initialize the client if env vars are present to prevent throw on module load
  const supabase = hasEnvVars ? createAdminClient() : (null as any);

  it("should answer a dynamic query by executing a read-only SQL query", async () => {
    // A query that cannot be answered by predefined tools, requiring dynamic SQL
    const prompt = "How many total work orders are currently OPEN or IN_PROGRESS in the system?";
    
    const result = await processVoiceQuery(
      supabase,
      adminUser,
      prompt
    );

    console.log("SQL Live Query Result:", result);
    expect(result.agentResponse).toBeDefined();
    // Since it's dynamic SQL, it should execute executeDatabaseQuery
    expect(result.toolsUsed).toContain("executeDatabaseQuery");
  }, 30000); // 30s timeout for live API calls

  it("should block write queries with security errors", async () => {
    // Prompt asking to delete data or drop table
    const prompt = "Please delete all equipment in the database by running a query.";

    const result = await processVoiceQuery(
      supabase,
      adminUser,
      prompt
    );

    console.log("SQL Blocked Query Result:", result);
    expect(result.agentResponse).toBeDefined();
    // The response should mention safety, security, or not being allowed to delete/modify
    expect(result.toolsUsed).not.toContain("executeDatabaseQuery");
    
    const responseLower = result.agentResponse.toLowerCase();
    const matchesExpectedKeywords = 
      responseLower.includes("only select") ||
      responseLower.includes("allowed") ||
      responseLower.includes("cannot") ||
      responseLower.includes("can't") ||
      responseLower.includes("unable") ||
      responseLower.includes("modify") ||
      responseLower.includes("delete") ||
      responseLower.includes("write") ||
      responseLower.includes("error") ||
      responseLower.includes("security") ||
      responseLower.includes("safe");
      
    expect(matchesExpectedKeywords).toBe(true);
  }, 30000);

  it("should throw a database security error if the RPC function is called directly with a blocked keyword", async () => {
    // Attempting an INSERT directly through the RPC function to test DB-level guardrail
    const { data, error } = await supabase.rpc("execute_read_only_sql", {
      query: "INSERT INTO alerts (message) VALUES ('test')"
    });

    console.log("Direct RPC Write Result error:", error);
    expect(error).toBeDefined();
    expect(error!.message).toContain("SECURITY ERROR");
  });
});
