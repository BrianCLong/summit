import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { writeArtifacts } from "../../writeset/writeArtifacts";
import { MemoryQuarantineStore } from "../../epistemics/quarantine/quarantineStore";

function load(name: string) {
  const p = path.join(__dirname, "../../fixtures/eis/writesets", name);
  return JSON.parse(readFileSync(p, "utf-8"));
}

describe("EIS golden: quarantine", () => {
  it("quarantines fast-spread + coordination fixtures", async () => {
    const quarantineStore = new MemoryQuarantineStore();
    const ws = load("ws_fast_spread_low_evidence.json");

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

    expect(decision.disposition).toBe("quarantine");
    if (decision.disposition !== "quarantine") return;

    const cases = await quarantineStore.listCases({ status: "open" });
    expect(cases.length).toBe(1);
    expect(cases[0].quarantine_case_id).toBe(decision.quarantine_case_id);
  });
});
