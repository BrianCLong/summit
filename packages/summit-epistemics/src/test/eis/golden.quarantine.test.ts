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

describe("EIS golden: quarantine path", () => {
  it("quarantines ws_fast_spread_low_evidence (high burst + high coordination)", async () => {
    const store = new MemoryQuarantineStore();
    const ws = loadFixture("ws_fast_spread_low_evidence.json");

    const decision = await writeArtifacts(ws, { quarantineStore: store, cfg });

    expect(decision.disposition).toBe("quarantine");
    if (decision.disposition !== "quarantine") return;

    // signals must include burst and coordination
    const codes = decision.signals_triggered.map((s) => s.code);
    expect(codes).toContain("burst_velocity");
    expect(codes).toContain("coordination_fingerprint");

    // case persisted in store
    const cases = await store.listCases({ status: "open" });
    expect(cases).toHaveLength(1);
    expect(cases[0].quarantine_case_id).toBe(decision.quarantine_case_id);
    expect(cases[0].writeset.writeset_id).toBe("ws_0002");
  });

  it("quarantines ws_bad_provenance (missing provenance fields on evidence node)", async () => {
    const store = new MemoryQuarantineStore();
    const ws = loadFixture("ws_bad_provenance.json");

    const decision = await writeArtifacts(ws, { quarantineStore: store, cfg });

    expect(decision.disposition).toBe("quarantine");
    if (decision.disposition !== "quarantine") return;

    const codes = decision.signals_triggered.map((s) => s.code);
    expect(codes).toContain("provenance_anomaly");

    const cases = await store.listCases({ status: "open" });
    expect(cases).toHaveLength(1);
  });

  it("quarantine case IDs are stable (same writeset → same case ID)", async () => {
    const store = new MemoryQuarantineStore();
    const ws = loadFixture("ws_fast_spread_low_evidence.json");

    const d1 = await writeArtifacts(ws, { quarantineStore: store, cfg });
    const d2 = await writeArtifacts(ws, { quarantineStore: store, cfg });

    expect(d1.disposition).toBe("quarantine");
    expect(d2.disposition).toBe("quarantine");
    if (d1.disposition !== "quarantine" || d2.disposition !== "quarantine") return;

    expect(d1.quarantine_case_id).toBe(d2.quarantine_case_id);
  });

  it("quarantine store updateStatus works", async () => {
    const store = new MemoryQuarantineStore();
    const ws = loadFixture("ws_fast_spread_low_evidence.json");

    const decision = await writeArtifacts(ws, { quarantineStore: store, cfg });
    if (decision.disposition !== "quarantine") return;

    await store.updateStatus(decision.quarantine_case_id, "resolved_reject");
    const open = await store.listCases({ status: "open" });
    expect(open).toHaveLength(0);

    const resolved = await store.listCases({ status: "resolved_reject" });
    expect(resolved).toHaveLength(1);
  });
});
