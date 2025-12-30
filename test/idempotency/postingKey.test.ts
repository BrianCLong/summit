import { describe, expect, it } from '@jest/globals';

import {
  derivePostingKey,
  ReceiptIdempotencyInput,
  snapshotForKey,
} from '../../server/src/finance/idempotency/postingKey';

const baseInput: ReceiptIdempotencyInput = {
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

describe('derivePostingKey', () => {
  it('generates a stable key for identical receipt content across retries', () => {
    const first = derivePostingKey(baseInput);
    const second = derivePostingKey({
      ...baseInput,
      lineItems: [...(baseInput.lineItems ?? [])].reverse(),
      attributes: { region: 'us-east-1', channel: 'online' },
      paymentMethod: 'card',
    });

    expect(first).toEqual(second);
  });

  it('changes the key when rule version changes', () => {
    const current = derivePostingKey(baseInput);
    const next = derivePostingKey({ ...baseInput, ruleVersion: 'v1.1.0' });

    expect(current).not.toEqual(next);
  });

  it('distinguishes semantically different receipts', () => {
    const reference = derivePostingKey(baseInput);
    const modified = derivePostingKey({ ...baseInput, totalMinor: 1499 });

    expect(reference).not.toEqual(modified);
  });

  it('prefers receiptHash when provided and ignores other fields for stability', () => {
    const keyWithHash = derivePostingKey({
      ruleVersion: 'v1.0.0',
      receiptHash: 'abcdef',
      totalMinor: 1,
      currency: 'USD',
      occurredAt: '2025-01-15T12:00:00.000Z',
    });

    const keyWithDifferentFields = derivePostingKey({
      ruleVersion: 'v1.0.0',
      receiptHash: 'abcdef',
      totalMinor: 9999,
      currency: 'EUR',
      occurredAt: '2023-01-01T00:00:00.000Z',
    });

    expect(keyWithHash).toEqual(keyWithDifferentFields);
  });

  it('throws when required identifiers are missing', () => {
    expect(() =>
      derivePostingKey({
        ruleVersion: 'v1.0.0',
        currency: 'USD',
        totalMinor: 1299,
      }),
    ).toThrow('receiptHash or occurredAt, currency, and totalMinor are required to derive a posting key');
  });
});

describe('snapshotForKey', () => {
  it('returns a deterministic canonical payload useful for audits', () => {
    const snapshot = snapshotForKey(baseInput);
    const rerun = snapshotForKey({ ...baseInput, lineItems: baseInput.lineItems?.slice().reverse() });

    expect(snapshot).toEqual(rerun);
    expect(snapshot).toContain('ruleVersion');
    expect(snapshot).toContain('receiptId');
  });
});
