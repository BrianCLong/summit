import fs from "node:fs";
import path from "node:path";
import { runDeterministicTask } from "../../benchmarks/agent-spine/run";

const fixturePath = path.resolve("benchmarks/agent-spine/fixtures/graphrag-mini.json");
const outDir = path.resolve("artifacts/agent-spine");

const task = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const result = runDeterministicTask(task);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(result, null, 2));
fs.writeFileSync(
  path.join(outDir, "metrics.json"),
  JSON.stringify({ suite: result.suite, case_id: result.case_id, score: result.score, passed: result.passed }, null, 2)
);
fs.writeFileSync(
  path.join(outDir, "stamp.json"),
  JSON.stringify({ schema_version: "1", suite: result.suite, case_id: result.case_id }, null, 2)
);

if (!result.passed) {
  console.error("Agent benchmark spine failed: Missing expected evidence.");
  process.exit(1);
}

console.log("Agent benchmark spine completed successfully.");
