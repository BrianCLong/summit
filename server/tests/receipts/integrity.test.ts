
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { canonicalize } from '../../src/receipts/canonicalize';
import { calculateReceiptHash } from '../../src/receipts/hash';

describe('Receipt Integrity', () => {
  describe('canonicalize', () => {
    it('should be deterministic despite key ordering', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 2, a: 1 };
      expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });

    it('should normalize whitespace in strings', () => {
      const obj1 = { id: ' 123 ' };
      const obj2 = { id: '123' };
      expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });

    it('should normalize whitespace in keys', () => {
        const obj1 = { ' key ': 'value' };
        const obj2 = { 'key': 'value' };
        expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });

    it('should handle nested objects', () => {
      const obj1 = { meta: { id: 1, type: ' A ' }, data: [1, 2] };
      const obj2 = { data: [1, 2], meta: { type: 'A', id: 1 } };
      expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });

    it('should differentiate arrays with different order', () => {
      const obj1 = { list: [1, 2] };
      const obj2 = { list: [2, 1] };
      expect(canonicalize(obj1)).not.toBe(canonicalize(obj2));
    });

    it('should handle dates (as strings)', () => {
        const d = new Date('2023-01-01T00:00:00.000Z');
        const obj1 = { date: d };
        // Date toJSON returns ISO string
        const obj2 = { date: '2023-01-01T00:00:00.000Z' };
        expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });
  });

  describe('calculateReceiptHash', () => {
    it('should generate same hash for same semantic receipt', () => {
      const r1 = {
        id: 'rec_123',
        amount: 100.50,
        currency: 'USD',
        items: [{ id: 'item_1', price: 50.25 }, { id: 'item_2', price: 50.25 }],
        metadata: { source: '  stripe  ' }
      };
      const r2 = {
        metadata: { source: 'stripe' },
        currency: 'USD',
        items: [{ price: 50.25, id: 'item_1' }, { id: 'item_2', price: 50.25 }],
        amount: 100.50,
        id: 'rec_123'
      };

      const h1 = calculateReceiptHash(r1);
      const h2 = calculateReceiptHash(r2);
      expect(h1).toBe(h2);
    });

    it('should generate different hash for different receipt', () => {
      const r1 = { id: 'rec_1' };
      const r2 = { id: 'rec_2' };
      expect(calculateReceiptHash(r1)).not.toBe(calculateReceiptHash(r2));
    });

    it('should generate different hash for different array order', () => {
        const r1 = { items: [1, 2] };
        const r2 = { items: [2, 1] };
        expect(calculateReceiptHash(r1)).not.toBe(calculateReceiptHash(r2));
    });
  });
});
