import { routeAgent } from "../../src/agents/router/router"
import { test, expect } from "vitest"

test("routeAgent", () => {
  expect(routeAgent("refactor this")).toBe("cursor")
  expect(routeAgent("check security")).toBe("observer")
  expect(routeAgent("do something")).toBe("default")
})
