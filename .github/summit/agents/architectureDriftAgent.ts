import { writeSummary } from "../lib/artifacts";
import { getRunMeta } from "../lib/context";

export async function architectureDriftAgent(): Promise<void> {
  const meta = getRunMeta();
  writeSummary(`## Architecture Drift
- Drift detected: no (stub)
- Repo: ${meta.repo}
- Run: ${meta.runId}
- Actor: ${meta.actor}
`);
}
