import { describe, expect, it } from "vitest";
import { LineageService, ProvenanceEnvelope } from "../src/lineage/lineageService.js";

function makeArtifact(
  id: string,
  payload: unknown,
  overrides: Partial<ProvenanceEnvelope["metadata"]> = {}
) {
  const observedAt = new Date().toISOString();
  return {
    id,
    payload,
    metadata: {
      origin: `source-${id}`,
      confidence: 0.92,
      isSimulated: false,
      observedAt,
      ...overrides,
    },
  } satisfies ProvenanceEnvelope;
}

describe("LineageService", () => {
  it("enforces provenance metadata on registration and transformation outputs", () => {
    const service = new LineageService();
    expect(() =>
      service.registerArtifact({
        id: "invalid",
        payload: {},
        metadata: {
          origin: "",
          confidence: 0.5,
          isSimulated: false,
          observedAt: new Date().toISOString(),
        },
      })
    ).toThrow(/origin/);

    const valid = makeArtifact("raw", { reading: 1 });
    service.registerArtifact(valid);

    expect(() =>
      service.recordTransformation({
        id: "bad-confidence",
        operation: "derive",
        inputs: ["raw"],
        outputs: [
          makeArtifact(
            "derived",
            { normalized: 1 },
            {
              origin: "derived-system",
              confidence: 2,
            }
          ),
        ],
      })
    ).toThrow(/confidence/);
  });

  it("builds bidirectional traces so auditors can reconstruct flows", () => {
    const service = new LineageService();
    const observedAt = new Date().toISOString();
    service.registerArtifact({
      id: "sensor-a",
      payload: { reading: 1 },
      metadata: { origin: "sensor-a", confidence: 0.91, isSimulated: false, observedAt },
    });
    service.registerArtifact({
      id: "sensor-b",
      payload: { reading: 2 },
      metadata: { origin: "sensor-b", confidence: 0.93, isSimulated: false, observedAt },
    });

    service.recordTransformation({
      id: "fusion",
      operation: "fusion",
      inputs: ["sensor-a", "sensor-b"],
      outputs: [
        {
          id: "fused",
          payload: { reading: 1.5 },
          metadata: { origin: "fusion-service", confidence: 0.89, isSimulated: false, observedAt },
        },
      ],
      actor: "pipeline",
    });

    service.recordTransformation({
      id: "simulation",
      operation: "simulation-label",
      inputs: ["fused"],
      outputs: [
        {
          id: "simulated",
          payload: { reading: 1.5 },
          metadata: { origin: "sim-lab", confidence: 0.8, isSimulated: true, observedAt },
        },
      ],
      notes: "Downstream consumers must know this is simulated",
    });

    const trace = service.trace("simulated");
    expect(trace.roots).toEqual(expect.arrayContaining(["sensor-a", "sensor-b"]));
    expect(trace.leaves).toContain("simulated");
    expect(trace.edges).toEqual(
      expect.arrayContaining([
        { from: "sensor-a", to: "fused", via: "fusion" },
        { from: "sensor-b", to: "fused", via: "fusion" },
        { from: "fused", to: "simulated", via: "simulation" },
      ])
    );

    const audit = service.auditTrail("simulated");
    expect(audit.verification.valid).toBe(true);
    expect(audit.ledger.some((entry) => entry.id === "simulation")).toBe(true);
  });

  it("can verify tampering by replaying the canonical ledger", () => {
    const service = new LineageService();
    const base = makeArtifact("raw", { reading: 3 });
    service.registerArtifact(base);
    service.recordTransformation({
      id: "normalize",
      operation: "normalize",
      inputs: ["raw"],
      outputs: [makeArtifact("normalized", { reading: 0.3 }, { origin: "normalizer" })],
      timestamp: new Date().toISOString(),
    });

    const initial = service.auditTrail("normalized");
    expect(initial.verification.valid).toBe(true);

    const ledger = (service as any).ledger;
    const events = ledger.list(0, Number.MAX_SAFE_INTEGER);
    events[events.length - 1].payload = { tampered: true };
    const verification = ledger.verify("lineage");
    expect(verification.valid).toBe(false);
  });
});
