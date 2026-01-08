import {
  applyRedactions,
  computeReceiptPayloadHash,
  computeReceiptHash,
  signReceipt,
  verifyReceiptSignature,
  Receipt,
  RECEIPT_VERSION,
} from "..";

const baseReceiptInput = {
  id: "rcpt-1",
  caseId: "case-123",
  claimIds: ["claim-a", "claim-b"],
  createdAt: "2024-11-05T12:00:00.000Z",
  actor: { id: "alice", role: "analyst" },
};

describe("@intelgraph/provenance receipt helpers", () => {
  it("signs and verifies a receipt deterministically", () => {
    const receipt = signReceipt(baseReceiptInput);

    expect(receipt.version).toBe(RECEIPT_VERSION);
    expect(receipt.payloadHash).toHaveLength(64);
    expect(receipt.proofs.receiptHash).toHaveLength(64);
    expect(verifyReceiptSignature(receipt)).toBe(true);

    const recomputedPayloadHash = computeReceiptPayloadHash(receipt);
    expect(recomputedPayloadHash).toBe(receipt.payloadHash);

    const recomputedReceiptHash = computeReceiptHash(receipt);
    expect(recomputedReceiptHash).toBe(receipt.proofs.receiptHash);
  });

  it("applies redactions using dotted paths", () => {
    const receipt: Receipt = signReceipt({
      ...baseReceiptInput,
      metadata: { sensitive: { secret: "123", visible: true } },
    });

    const sanitized = applyRedactions(receipt, [
      { path: "metadata.sensitive.secret", reason: "least-privilege" },
    ]);

    expect((sanitized.metadata as any)?.sensitive?.secret).toBeUndefined();
    expect((sanitized.metadata as any)?.sensitive?.visible).toBe(true);
    // Redacting fields will invalidate the original signature, so exports must
    // ship both the sanitized and original hashes for verification.
    expect(verifyReceiptSignature(sanitized)).toBe(false);
  });
});
