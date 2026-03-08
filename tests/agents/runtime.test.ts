import { runAgentTask } from "../../src/agents/runtime/agentRuntime"
import { test, expect } from "vitest"

test("runAgentTask", async () => {
  const result = await runAgentTask({ task: "test", context: "" })
  expect(result.result).toBe("")
})
