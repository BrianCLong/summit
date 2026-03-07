import { writeArtifact, writeSummary } from "../lib/artifacts";
import { readEventPayload, getRunMeta } from "../lib/context";

export async function triageAgent(): Promise<void> {
  const payload = readEventPayload();
  const title = payload?.issue?.title || "";

  const classification =
    /security|secret|token|auth/i.test(title) ? "security" :
    /graph|ontology|intelgraph|schema/i.test(title) ? "architecture" :
    /ci|workflow|action/i.test(title) ? "infra" :
    "general";

  const result = {
    ...getRunMeta(),
    classification,
    labels:
      classification === "security" ? ["area:security", "needs-triage"] :
      classification === "architecture" ? ["area:intelgraph", "needs-triage"] :
      classification === "infra" ? ["area:ci", "needs-triage"] :
      ["needs-triage"],
    lane:
      classification === "security" ? "lane:security" :
      classification === "architecture" ? "lane:architecture" :
      classification === "infra" ? "lane:infra" :
      "lane:general",
  };

  writeArtifact("result.json", result);
  writeSummary(`## Issue Triage
- Classification: ${result.classification}
- Suggested labels: ${result.labels.join(", ")}
- Suggested lane: ${result.lane}
`);
}
