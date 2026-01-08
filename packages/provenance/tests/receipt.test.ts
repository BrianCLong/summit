import { generateKeyPairSync } from "crypto";
import { ExecutionReceipt, applyRedaction, hashReceipt, signReceipt, verifyReceipt } from "../src";

const baseReceipt: ExecutionReceipt = {
  id: "receipt-1",
  createdAt: new Date("2024-01-02T03:04:05Z").toISOString(),
  executionId: "exec-123",
  hashes: {
    inputs: [
      { name: "input-a", hash: "aaa", redactable: true },
      { name: "input-b", hash: "bbb" },
    ],
    outputs: [{ name: "output-a", hash: "ccc" }],
    manifest: "manifest-hash",
  },
  steps: [
    {
      id: "s1",
      name: "ingest",
      timestamp: new Date("2024-01-02T03:04:05Z").toISOString(),
      status: "completed",
      inputs: ["input-a"],
      outputs: ["output-a"],
      metadata: { tool: "loader" },
    },
  ],
  signer: { keyId: "local-dev", algorithm: "ed25519" },
  signature: "",
};

describe("provenance receipt helpers", () => {
  it("produces a deterministic hash", () => {
    const digestA = hashReceipt(baseReceipt);
    const digestB = hashReceipt({ ...baseReceipt, steps: [...(baseReceipt.steps ?? [])] });
    expect(digestA).toEqual(digestB);
  });

  it("signs and verifies receipt payloads", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const signed = signReceipt(baseReceipt, privateKey.export({ format: "pem", type: "pkcs8" }));
    const isValid = verifyReceipt(signed, publicKey.export({ format: "pem", type: "spki" }));
    expect(isValid).toBe(true);
  });

  it("redacts configured fields and tracks disclosure metadata", () => {
    const redacted = applyRedaction(baseReceipt, ["input-a"], "PII removal");
    expect(redacted.hashes.inputs.find((h) => h.name === "input-a")?.hash).toEqual("REDACTED");
    expect(redacted.disclosure?.redactions).toContain("input-a");
    expect(redacted.disclosure?.reason).toEqual("PII removal");
  });
});
