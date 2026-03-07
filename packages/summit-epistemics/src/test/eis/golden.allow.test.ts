import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeArtifacts } from "../../writeset/writeArtifacts.js";
import { MemoryQuarantineStore } from "../../epistemics/quarantine/quarantineStore.js";
import type { WriteSetEnvelope } from "../../writeset/types.js";
import type { SentinelConfig } from "../../epistemics/sentinels/signals.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): WriteSetEnvelope {
  const p = path.join(__dirname, "../../fixtures/eis/writesets", name);
  return JSON.parse(readFileSync(p, "utf-8")) as WriteSetEnvelope;
}

const cfg: SentinelConfig = {
  burstWindowSec: 120,
  burstThreshold: 100,
  minEvidenceLinks: 1,
  provenanceRequiredFields: ["source", "collected_at", "collector"],
  quarantineScoreThreshold: 0.8,
  allowWithFlagsThreshold: 0.4,
};

describe("EIS golden: allow path", () => {
  it("allows ws_clean_claim (low burst + good provenance + low coordination)", async () => {
    const store = new MemoryQuarantineStore();
    const ws = loadFixture("ws_clean_claim.json");

    const decision = await writeArtifacts(ws, { quarantineStore: store, cfg });

    expect(["allow", "allow_with_flags"]).toContain(decision.disposition);

    // Nothing should land in quarantine
    const cases = await store.listCases();
    expect(cases).toHaveLength(0);
  });

  it("returns allow with writeset_id echoed back", async () => {
    const store = new MemoryQuarantineStore();
    const ws = loadFixture("ws_clean_claim.json");

    const decision = await writeArtifacts(ws, { quarantineStore: store, cfg });

    expect(decision.writeset_id).toBe("ws_0001");
  });
});
