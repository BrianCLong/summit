import { ValidationResult, CheckResult } from "./types";

export async function runChecks(
  checks: Array<() => Promise<CheckResult>>
): Promise<ValidationResult> {
  const started_at = new Date().toISOString().replace(/\.\d+Z$/, "Z");

  const results: CheckResult[] = [];
  for (const c of checks) {
    try {
      results.push(await c());
    } catch (e: any) {
      results.push({
        name: "unknown-check",
        status: "fail",
        details: { error: e.message },
      });
    }
  }

  const hard_failures = results.filter((r) => r.status === "fail").length;
  return { started_at, checks: results, hard_failures, soft_failures: 0 };
}
