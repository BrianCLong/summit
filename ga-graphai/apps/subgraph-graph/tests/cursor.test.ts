import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from '../src/utils/cursor.js';

describe('cursor utils', () => {
  it('round trips offsets via base64 encoding', () => {
    const cursor = encodeCursor(42);
    expect(decodeCursor(cursor)).toBe(42);
  });

  it('guards against invalid input', () => {
    expect(decodeCursor('not-base64')).toBe(0);
    expect(decodeCursor(null)).toBe(0);
  });
});
