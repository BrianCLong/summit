import { chooseArchitecture, TaskFeatures } from "../../agentic-research/maestro-architecture/src/architectureSelector";
import { errorAmplificationGuard } from "../../agentic-research/maestro-architecture/src/errorAmplification";

test("chooses correct architecture based on features", () => {
  const f: TaskFeatures = { id: "t1", decomposability: 0.9, toolCount: 5, sequentialDependency: 0.1, risk: 0 };
  expect(chooseArchitecture(f)).toBe("CENTRALIZED");
});

test("recommends fallback on high error rate", () => {
  const results = Array.from({ length: 10 }).map((_, i) => ({ ok: i >= 5 })); // 50% error
  const guard = errorAmplificationGuard("CENTRALIZED", results);
  expect(guard.recommended).toBe("SINGLE_AGENT");
});
