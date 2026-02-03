import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const scriptPath = path.join("scripts", "evals", "hybrid_eval.mjs");

function runEval(outputDir: string) {
  execFileSync("node", [scriptPath], {
    env: { ...process.env, HYBRID_EVAL_OUTPUT_DIR: outputDir },
    stdio: "ignore",
  });

  return {
    report: fs.readFileSync(path.join(outputDir, "report.json"), "utf8"),
    metrics: fs.readFileSync(path.join(outputDir, "metrics.json"), "utf8"),
    stamp: fs.readFileSync(path.join(outputDir, "stamp.json"), "utf8"),
  };
}

describe("hybrid_eval.mjs determinism", () => {
  it("emits stable outputs across runs", () => {
    const dir1 = fs.mkdtempSync(path.join(os.tmpdir(), "hybrid-eval-"));
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "hybrid-eval-"));

    const first = runEval(dir1);
    const second = runEval(dir2);

    expect(first.report).toBe(second.report);
    expect(first.metrics).toBe(second.metrics);
    expect(first.stamp).toBe(second.stamp);
  });
});
