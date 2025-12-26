import {
  canonicalizeOrder,
  deterministicNormalize,
  maskUuids,
  normalizeTimestamps,
  stableHash,
} from '../../testkit/golden/index.js';

describe('golden normalizers', () => {
  const sample = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nested: {
      createdAt: '2024-12-24T12:34:56.789Z',
      list: [
        { value: 2, id: '123e4567-e89b-12d3-a456-426614174000' },
        { value: 1, id: '123e4567-e89b-12d3-a456-426614174001' },
      ],
    },
  };

  test('normalizes timestamps and uuids deterministically', () => {
    const normalized = deterministicNormalize(sample);
    expect(normalized).toEqual({
      id: '<UUID>',
      nested: {
        createdAt: '<ISO_TIMESTAMP>',
        list: [
          { id: '<UUID>', value: 1 },
          { id: '<UUID>', value: 2 },
        ],
      },
    });
  });

  test('canonicalizeOrder sorts objects and arrays', () => {
    const shuffled = { b: 2, a: 1, list: [{ z: 1 }, { a: 1 }] };
    expect(canonicalizeOrder(shuffled)).toEqual({
      a: 1,
      b: 2,
      list: [{ a: 1 }, { z: 1 }],
    });
  });

  test('stableHash remains constant for equivalent payloads', () => {
    const first = stableHash(sample);
    const second = stableHash({ ...sample });
    expect(first).toBe(second);
  });

  test('normalizers do not alter plain strings', () => {
    expect(maskUuids('plain-string')).toBe('plain-string');
    expect(normalizeTimestamps('plain-string')).toBe('plain-string');
  });
});
