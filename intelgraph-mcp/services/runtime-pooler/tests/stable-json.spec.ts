import { describe, it, expect } from 'vitest';
import { stableStringify } from '../src/utils/stableJson';

function shuffle<T>(items: T[]): T[] {
  return items
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

describe('stableStringify', () => {
  it('stabilizes object key order across permutations', () => {
    const base = { a: 1, b: 2, c: { z: 9, y: 8 } };
    const baseKeys = Object.keys(base);
    const outputs = new Set<string>();

    for (let i = 0; i < 20; i += 1) {
      const shuffled = shuffle(baseKeys);
      const obj: Record<string, unknown> = {};
      for (const key of shuffled) {
        obj[key] = base[key as keyof typeof base];
      }
      outputs.add(stableStringify(obj));
    }

    expect(outputs.size).toBe(1);
  });
});
