import { describe, expect, it } from 'vitest';
import { safeProps } from '../../src/lib/analytics/events';

describe('analytics utilities', () => {
  describe('safeProps', () => {
    it('returns empty object for null input', () => {
      expect(safeProps(null)).toEqual({});
    });

    it('returns empty object for undefined input', () => {
      expect(safeProps(undefined)).toEqual({});
    });

    it('returns empty object for non-object input', () => {
      expect(safeProps('string')).toEqual({});
      expect(safeProps(123)).toEqual({});
    });

    it('preserves string values', () => {
      expect(safeProps({ key: 'value' })).toEqual({ key: 'value' });
    });

    it('preserves number values', () => {
      expect(safeProps({ count: 42 })).toEqual({ count: 42 });
    });

    it('preserves boolean values', () => {
      expect(safeProps({ active: true, disabled: false })).toEqual({
        active: true,
        disabled: false,
      });
    });

    it('preserves null values', () => {
      expect(safeProps({ empty: null })).toEqual({ empty: null });
    });

    it('filters out object values', () => {
      expect(safeProps({ nested: { key: 'value' } })).toEqual({});
    });

    it('filters out array values', () => {
      expect(safeProps({ items: [1, 2, 3] })).toEqual({});
    });

    it('handles mixed values correctly', () => {
      const input = {
        str: 'hello',
        num: 42,
        bool: true,
        nil: null,
        obj: { nested: true },
        arr: [1, 2],
      };

      expect(safeProps(input)).toEqual({
        str: 'hello',
        num: 42,
        bool: true,
        nil: null,
      });
    });
  });
});
