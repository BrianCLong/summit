import test from "node:test";
import assert from "node:assert";
import { runConformance } from "../../../scripts/decision/run-conformance.ts";

test("Conformance test evaluates golden YAML correctly", async () => {
  const result = await runConformance();
  assert.strictEqual(result.resourceName, "test-decision-001");
  assert.strictEqual(result.status.allowed, true);
  assert.strictEqual(result.status.phase, "Admitted");
  assert.strictEqual(result.status.trustScore, 80);
});
