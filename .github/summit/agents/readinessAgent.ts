import { writeArtifact, writeSummary } from "../lib/artifacts";
import { getRunMeta, readEventPayload } from "../lib/context";

export async function readinessAgent(): Promise<void> {
  const payload = readEventPayload();
  const filesChanged = payload?.pull_request?.changed_files ?? 0;
  const additions = payload?.pull_request?.additions ?? 0;
  const deletions = payload?.pull_request?.deletions ?? 0;

  const blockers: string[] = [];
  if (filesChanged > 25) blockers.push("PR exceeds preferred atomicity threshold (>25 files)");
  if (additions + deletions > 1500) blockers.push("PR exceeds preferred size threshold (>1500 LOC delta)");

  const score = Math.max(0, 1 - blockers.length * 0.15);
  const status = blockers.length === 0 ? "ready" : "needs-attention";

  const result = {
    ...getRunMeta(),
    score,
    status,
    blockers,
    metrics: { filesChanged, additions, deletions },
  };

  writeArtifact("result.json", result);
  writeSummary(`## PR Readiness
- Score: ${score.toFixed(2)}
- Status: ${status}
- Files changed: ${filesChanged}
- Additions: ${additions}
- Deletions: ${deletions}

### Blockers
${blockers.length ? blockers.map((b) => `- ${b}`).join("\n") : "- None"}
`);
}
