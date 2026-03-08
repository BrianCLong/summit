"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const baseReceiptInput = {
    id: 'rcpt-1',
    caseId: 'case-123',
    claimIds: ['claim-a', 'claim-b'],
    createdAt: '2024-11-05T12:00:00.000Z',
    actor: { id: 'alice', role: 'analyst' },
};
describe('@intelgraph/provenance receipt helpers', () => {
    it('signs and verifies a receipt deterministically', () => {
        const receipt = (0, __1.signReceipt)(baseReceiptInput);
        expect(receipt.version).toBe(__1.RECEIPT_VERSION);
        expect(receipt.payloadHash).toHaveLength(64);
        expect(receipt.proofs.receiptHash).toHaveLength(64);
        expect((0, __1.verifyReceiptSignature)(receipt)).toBe(true);
        const recomputedPayloadHash = (0, __1.computeReceiptPayloadHash)(receipt);
        expect(recomputedPayloadHash).toBe(receipt.payloadHash);
        const recomputedReceiptHash = (0, __1.computeReceiptHash)(receipt);
        expect(recomputedReceiptHash).toBe(receipt.proofs.receiptHash);
    });
    it('applies redactions using dotted paths', () => {
        const receipt = (0, __1.signReceipt)({
            ...baseReceiptInput,
            metadata: { sensitive: { secret: '123', visible: true } },
        });
        const sanitized = (0, __1.applyRedactions)(receipt, [
            { path: 'metadata.sensitive.secret', reason: 'least-privilege' },
        ]);
        expect(sanitized.metadata?.sensitive?.secret).toBeUndefined();
        expect(sanitized.metadata?.sensitive?.visible).toBe(true);
        // Redacting fields will invalidate the original signature, so exports must
        // ship both the sanitized and original hashes for verification.
        expect((0, __1.verifyReceiptSignature)(sanitized)).toBe(false);
    });
});
