import { writeArtifact, writeSummary } from "../lib/artifacts";
import { getRunMeta } from "../lib/context";

export async function architectureDriftAgent(): Promise<void> {
  const violations = [
    {
      rule: "ui-must-not-import-intelgraph-core",
      status: "stub",
      note: "Static import graph scan not yet wired",
    },
  ];

  const result = {
    ...getRunMeta(),
    driftDetected: false,
    violations,
  };

  writeArtifact("result.json", result);
  writeSummary(`## Architecture Drift
- Drift detected: ${result.driftDetected ? "yes" : "no"}

### Rules
${violations.map((v) => `- ${v.rule}: ${v.status} (${v.note})`).join("\n")}
`);
}
