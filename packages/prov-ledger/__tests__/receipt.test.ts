/// <reference types="jest" />
import { emitDecisionReceipt, hashJson, type ProvenanceManifest } from "../src/index";

describe("emitDecisionReceipt", () => {
  it("captures decision metadata with digests and retries", () => {
    const manifest: ProvenanceManifest = { artifactId: "artifact-123", steps: [] };
    const subject = { id: "user-1", roles: ["analyst"] };
    const resource = { id: "adapter-1", tenantId: "t1" };
    const context = { currentAcr: "loa1", requestTime: "2024-01-01T00:00:00Z" };

    const { receipt, step } = emitDecisionReceipt({
      manifest,
      adapterId: "adapter-1",
      action: "adapter:invoke",
      decision: "allow",
      subject,
      resource,
      context,
      retries: 2,
      obligations: [{ type: "header", requirement: "x-step-up" }],
      stepId: "decision-1",
      tool: "authz-gateway",
    });

    expect(receipt.id).toBe("decision-1");
    expect(receipt.retries).toBe(2);
    expect(receipt.digests.subject).toBe(hashJson(subject));
    expect(receipt.digests.resource).toBe(hashJson(resource));
    expect(receipt.obligations?.[0]).toEqual({ type: "header", requirement: "x-step-up" });
    expect(step.params).toMatchObject({
      action: "adapter:invoke",
      decision: "allow",
      retries: 2,
      adapterId: "adapter-1",
    });
    expect(manifest.steps).toHaveLength(1);
    expect(manifest.steps?.[0]?.id).toBe("decision-1");
  });
});
