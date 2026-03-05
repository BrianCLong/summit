import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { writeArtifacts } from "../../writeset/writeArtifacts";
import { MemoryQuarantineStore } from "../../epistemics/quarantine/quarantineStore";

function load(name: string) {
  const p = path.join(__dirname, "../../fixtures/eis/writesets", name);
  return JSON.parse(readFileSync(p, "utf-8"));
}

describe("EIS golden: allow", () => {
  it("allows a clean claim fixture", async () => {
    const quarantineStore = new MemoryQuarantineStore();
    const ws = load("ws_clean_claim.json");

    const decision = await writeArtifacts(ws, {
      quarantineStore,
      cfg: {
        burstWindowSec: 120,
        burstThreshold: 100,
        minEvidenceLinks: 1,
        provenanceRequiredFields: ["source", "collected_at", "collector"],
        quarantineScoreThreshold: 0.8,
        allowWithFlagsThreshold: 0.4
      }
    });

    expect(["allow", "allow_with_flags"]).toContain(decision.disposition);
    const cases = await quarantineStore.listCases();
    expect(cases.length).toBe(0);
  });
});
