import { validateAgent } from "../../src/agents/policies/agentPolicy"
import { test, expect } from "vitest"

test("validateAgent", () => {
  expect(validateAgent("cursor")).toBe(true)
  expect(validateAgent("copilot")).toBe(true)
  expect(validateAgent("malicious-agent")).toBe(false)
})
