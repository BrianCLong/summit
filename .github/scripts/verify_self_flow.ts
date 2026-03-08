import path from "path";
import { fileURLToPath } from "url";
import { assertGrounded } from "../../src/graphrag/trajectory/grounding.js";

const badTraj = {
  taskId: "test",
  modality: "text" as const,
  steps: [],
  claims: [{ text: "foo", kgNodeIds: [], docSpans: [] }],
  policy: { piiRisk: "low" as const, blocked: false, reasons: [] }
};

const result = assertGrounded(badTraj);
if (result.ok) {
  console.error("Failed: Un-grounded trajectory passed");
  process.exit(1);
}
console.log("Passed: Deny-by-default logic works.");
