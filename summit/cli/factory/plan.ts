import { writeFileSync, mkdirSync } from "node:fs";

export async function runFactoryPlan(issueId: string) {
  const report = {
    issueId,
    mode: "plan",
    deterministic: true,
    claimRegistry: [],
    workItems: []
  };

  mkdirSync(`artifacts/ai-factory/${issueId}/plan`, { recursive: true });
  writeFileSync(
    `artifacts/ai-factory/${issueId}/plan/report.json`,
    JSON.stringify(report, null, 2)
  );
}
