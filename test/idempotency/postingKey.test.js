"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const postingKey_1 = require("../../server/src/finance/idempotency/postingKey");
const baseInput = {
    ruleVersion: 'v1.0.0',
    receiptId: 'rcpt_123',
    occurredAt: '2025-01-15T12:00:00.000Z',
    currency: 'USD',
    totalMinor: 1299,
    paymentMethod: 'Card',
    merchantId: 'merchant_42',
    lineItems: [
        { sku: 'A1', description: 'Widget', quantity: 1, amountMinor: 999 },
        { sku: 'B2', description: 'Service', quantity: 1, amountMinor: 300 },
    ],
    attributes: { channel: 'online', region: 'us-east-1' },
};
(0, globals_1.describe)('derivePostingKey', () => {
    (0, globals_1.it)('generates a stable key for identical receipt content across retries', () => {
        const first = (0, postingKey_1.derivePostingKey)(baseInput);
        const second = (0, postingKey_1.derivePostingKey)({
            ...baseInput,
            lineItems: [...(baseInput.lineItems ?? [])].reverse(),
            attributes: { region: 'us-east-1', channel: 'online' },
            paymentMethod: 'card',
        });
        (0, globals_1.expect)(first).toEqual(second);
    });
    (0, globals_1.it)('changes the key when rule version changes', () => {
        const current = (0, postingKey_1.derivePostingKey)(baseInput);
        const next = (0, postingKey_1.derivePostingKey)({ ...baseInput, ruleVersion: 'v1.1.0' });
        (0, globals_1.expect)(current).not.toEqual(next);
    });
    (0, globals_1.it)('distinguishes semantically different receipts', () => {
        const reference = (0, postingKey_1.derivePostingKey)(baseInput);
        const modified = (0, postingKey_1.derivePostingKey)({ ...baseInput, totalMinor: 1499 });
        (0, globals_1.expect)(reference).not.toEqual(modified);
    });
    (0, globals_1.it)('prefers receiptHash when provided and ignores other fields for stability', () => {
        const keyWithHash = (0, postingKey_1.derivePostingKey)({
            ruleVersion: 'v1.0.0',
            receiptHash: 'abcdef',
            totalMinor: 1,
            currency: 'USD',
            occurredAt: '2025-01-15T12:00:00.000Z',
        });
        const keyWithDifferentFields = (0, postingKey_1.derivePostingKey)({
            ruleVersion: 'v1.0.0',
            receiptHash: 'abcdef',
            totalMinor: 9999,
            currency: 'EUR',
            occurredAt: '2023-01-01T00:00:00.000Z',
        });
        (0, globals_1.expect)(keyWithHash).toEqual(keyWithDifferentFields);
    });
    (0, globals_1.it)('throws when required identifiers are missing', () => {
        (0, globals_1.expect)(() => (0, postingKey_1.derivePostingKey)({
            ruleVersion: 'v1.0.0',
            currency: 'USD',
            totalMinor: 1299,
        })).toThrow('receiptHash or occurredAt, currency, and totalMinor are required to derive a posting key');
    });
});
(0, globals_1.describe)('snapshotForKey', () => {
    (0, globals_1.it)('returns a deterministic canonical payload useful for audits', () => {
        const snapshot = (0, postingKey_1.snapshotForKey)(baseInput);
        const rerun = (0, postingKey_1.snapshotForKey)({ ...baseInput, lineItems: baseInput.lineItems?.slice().reverse() });
        (0, globals_1.expect)(snapshot).toEqual(rerun);
        (0, globals_1.expect)(snapshot).toContain('ruleVersion');
        (0, globals_1.expect)(snapshot).toContain('receiptId');
    });
});
