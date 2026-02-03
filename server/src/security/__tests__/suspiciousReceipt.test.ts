
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { detectSuspiciousPayload, HEURISTIC_CONFIG } from '../suspiciousReceipt.js';

describe('Suspicious Payload Detection', () => {
  const normalPayload = {
    receiptId: '123',
    amount: 100,
    currency: 'USD',
    items: ['item1', 'item2'],
    description: 'Normal receipt'
  };

  it('should not trigger on normal payload', () => {
    const result = detectSuspiciousPayload(normalPayload);
    expect(result).toBeNull();
  });

  it('should detect extreme amounts', () => {
    const suspiciousPayload = {
      ...normalPayload,
      amount: HEURISTIC_CONFIG.MAX_AMOUNT + 1
    };
    const result = detectSuspiciousPayload(suspiciousPayload);
    expect(result).toEqual({
      isSuspicious: true,
      reason: "Extreme amount detected in field 'amount'",
      details: { key: 'amount', value: HEURISTIC_CONFIG.MAX_AMOUNT + 1, threshold: HEURISTIC_CONFIG.MAX_AMOUNT }
    });
  });

  it('should detect extreme amounts in nested objects', () => {
    const suspiciousPayload = {
      ...normalPayload,
      meta: {
        pricing: {
            total: HEURISTIC_CONFIG.MAX_AMOUNT + 100
        }
      }
    };
    const result = detectSuspiciousPayload(suspiciousPayload);
    expect(result).toEqual({
      isSuspicious: true,
      reason: "Extreme amount detected in field 'total'",
      details: { key: 'total', value: HEURISTIC_CONFIG.MAX_AMOUNT + 100, threshold: HEURISTIC_CONFIG.MAX_AMOUNT }
    });
  });

  it('should detect unusual currency codes', () => {
    const suspiciousPayload = {
      ...normalPayload,
      currency: 'XXX'
    };
    const result = detectSuspiciousPayload(suspiciousPayload);
    expect(result).toEqual({
        isSuspicious: true,
        reason: "Unusual currency code detected in field 'currency'",
        details: { key: 'currency', value: 'XXX' }
    });
  });

  it('should detect huge line items', () => {
    const hugeArray = new Array(HEURISTIC_CONFIG.MAX_LINE_ITEMS + 1).fill('item');
    const suspiciousPayload = {
      ...normalPayload,
      items: hugeArray
    };
    const result = detectSuspiciousPayload(suspiciousPayload);
    expect(result).toEqual({
        isSuspicious: true,
        reason: 'Huge line items array detected',
        details: { length: HEURISTIC_CONFIG.MAX_LINE_ITEMS + 1, threshold: HEURISTIC_CONFIG.MAX_LINE_ITEMS }
    });
  });

  it('should detect weird encodings (high non-ASCII ratio)', () => {
    // Construct a string with many non-ASCII characters
    const length = HEURISTIC_CONFIG.MAX_STRING_LENGTH + 100;
    // Create a string longer than threshold
    let badString = '';
    for (let i = 0; i < length; i++) {
        // Use a high-byte char
        badString += String.fromCharCode(0xFF);
    }

    const suspiciousPayload = {
      ...normalPayload,
      data: badString
    };

    const result = detectSuspiciousPayload(suspiciousPayload);
    expect(result).toEqual({
        isSuspicious: true,
        reason: 'Suspicious encoding detected (high non-ASCII ratio)',
        details: {
            ratio: 1,
            threshold: HEURISTIC_CONFIG.NON_ASCII_THRESHOLD,
            length: length
        }
    });
  });

  it('should not detect weird encodings for short strings', () => {
     // Short string with non-ascii should pass
     const badString = String.fromCharCode(0xFF).repeat(10);
     const result = detectSuspiciousPayload({ data: badString });
     expect(result).toBeNull();
  });

  it('should not trigger on large numbers in unrelated fields (e.g. timestamps)', () => {
    const payload = {
      ...normalPayload,
      created_at: 1700000000, // > 1 billion, but valid timestamp
      someId: 9999999999
    };
    const result = detectSuspiciousPayload(payload);
    expect(result).toBeNull();
  });
});
