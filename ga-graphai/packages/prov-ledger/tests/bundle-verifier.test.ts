import { describe, expect, it } from "vitest";
import type { EvidenceBundle } from "common-types";
import { EvidenceBundleVerifier } from "../src/bundle-verifier.js";
import { SimpleProvenanceLedger } from "../src/index.js";

function buildBundle(): EvidenceBundle {
  const ledger = new SimpleProvenanceLedger();
  ledger.append({
    id: "atom-1",
    category: "ingest",
    actor: "collector",
    action: "register",
    resource: "source",
    payload: { uri: "s3://bucket/object", policyId: "pol-1" },
  });
  ledger.append({
    id: "atom-2",
    category: "policy",
    actor: "policy-engine",
    action: "decision",
    resource: "ingest",
    payload: { decision: "allow", rule: "r1", policyId: "pol-1" },
  });
  return ledger.exportEvidence();
}

describe("EvidenceBundleVerifier", () => {
  it("accepts a bundle with proofs, snapshot commitment, and policy tokens", () => {
    const bundle = buildBundle();
    const verifier = new EvidenceBundleVerifier();

    const result = verifier.verify(bundle);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toEqual([]);
    expect(bundle.snapshotCommitment?.merkleRoot).toBeDefined();
    expect(bundle.policyDecisionTokens?.length).toBeGreaterThan(0);
  });

  it("permits redacted bundles with warnings when proofs are missing", () => {
    const bundle = buildBundle();
    const redacted: EvidenceBundle = {
      ...bundle,
      inclusionProofs: { ...(bundle.inclusionProofs ?? {}) },
      snapshotCommitment: { ...bundle.snapshotCommitment, redacted: true },
    };
    delete redacted.inclusionProofs?.["atom-2"];

    const verifier = new EvidenceBundleVerifier();
    const result = verifier.verify(redacted);

    expect(result.valid).toBe(true);
    expect(result.warnings).toContain("Missing inclusion proof for atom atom-2 (redacted view)");
  });

  it("flags missing proofs when bundle is not marked redacted", () => {
    const bundle = buildBundle();
    delete bundle.inclusionProofs?.["atom-1"];

    const verifier = new EvidenceBundleVerifier();
    const result = verifier.verify(bundle);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing inclusion proof for atom atom-1");
  });

  it("detects tampered policy decision tokens", () => {
    const bundle = buildBundle();
    if (bundle.policyDecisionTokens) {
      bundle.policyDecisionTokens[0] = { ...bundle.policyDecisionTokens[0], token: "tampered" };
    }

    const verifier = new EvidenceBundleVerifier();
    const result = verifier.verify(bundle);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Policy decision tokens do not match derived tokens");
  });
});
