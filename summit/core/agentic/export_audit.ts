import type { Run } from "./types";

export interface AuditExport {
  runId: string;
  workspaceId: string;
  plan: Run["plan"];
  steps: Run["steps"];
  artifacts: Run["artifacts"];
  hashChain?: { algo: "sha256"; head: string };
}

// Stub: implement hash-chain in PR3/PR4 once policy is wired.
export function exportAudit(run: Run): AuditExport {
  return {
    runId: run.id,
    workspaceId: run.workspaceId,
    plan: run.plan,
    steps: run.steps,
    artifacts: run.artifacts
  };
}
