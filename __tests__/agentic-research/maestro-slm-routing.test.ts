import { routeTask } from "../../agentic-research/maestro-slm-routing/src/complexityRouter";

test("routes simple tasks to SLM if allowed", () => {
  const c = { toolDensity: 0.1, sequentialDepth: 0.1 };
  expect(routeTask(c, true)).toBe("LOCAL_SLM");
});

test("routes complex tasks to Frontier", () => {
  const c = { toolDensity: 0.8, sequentialDepth: 0.9 };
  expect(routeTask(c, true)).toBe("FRONTIER_MODEL");
});

test("enforces policy constraints", () => {
  const c = { toolDensity: 0.8, sequentialDepth: 0.9, policyConstraints: ["RESIDENCY_LOCAL"] };
  expect(routeTask(c, true)).toBe("LOCAL_SLM");
});
