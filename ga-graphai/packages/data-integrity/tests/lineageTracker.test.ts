import { describe, it, expect } from "vitest";
import { LineageTracker } from "../src/index.js";

describe("LineageTracker", () => {
  it("attaches provenance on ingress and validates hash and source", () => {
    const tracker = new LineageTracker();
    const envelope = tracker.ingress(
      { foo: "bar" },
      {
        source: "api-gateway",
        ingress: "api",
        traceId: "trace-1",
      }
    );

    const validation = tracker.validate(envelope, { source: "api-gateway", ingress: "api" });

    expect(validation.valid).toBe(true);
    expect(envelope.provenance.checksum).toBeDefined();
    expect(envelope.provenance.traceId).toBe("trace-1");
    expect(validation.chainDepth).toBe(0);
  });

  it("propagates hops with chained checksums and renders headers", () => {
    const tracker = new LineageTracker({ signer: (hash) => `sig:${hash.slice(0, 6)}` });
    const ingress = tracker.ingress(
      { payload: "value" },
      {
        source: "broker",
        ingress: "message-broker",
        traceId: "trace-2",
        parentChecksums: ["root"],
      }
    );

    const hop = tracker.propagate(ingress, {
      source: "worker",
      ingress: "database",
      attributes: { shard: "alpha" },
    });

    expect(hop.provenance.chain?.length).toBe(2);
    expect(hop.provenance.signature).toMatch(/^sig:/);

    const headers = tracker.asHeaders(hop);
    const reconstructed = tracker.fromHeaders(ingress.payload, headers);
    const validation = tracker.validate(reconstructed, { source: "worker", ingress: "database" });

    expect(headers["x-lineage-chain"]).toContain("root");
    expect(reconstructed.provenance.attributes?.shard).toBe("alpha");
    expect(validation.hashMatches).toBe(true);
  });
});
