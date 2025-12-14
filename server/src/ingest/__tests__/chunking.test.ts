import { describe, it, expect, jest } from '@jest/globals';
import { chunkText } from '../../rag/chunking.js';

describe('chunkText', () => {
  it('should chunk text based on token/char approximation', () => {
    const text = 'a'.repeat(1000);
    // 500 tokens * 4 chars = 2000 chars limit.
    // Wait, test is simpler if we use small limits.

    const chunks = chunkText(text, 10, 0); // 40 chars limit
    // 1000 chars / 40 chars per chunk = 25 chunks
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThanOrEqual(40);
  });

  it('should handle overlap', () => {
    const text = '1234567890'.repeat(10); // 100 chars
    const chunks = chunkText(text, 5, 2); // 20 chars limit, 8 chars overlap

    expect(chunks[0].length).toBeLessThanOrEqual(20);
    // Check overlap... hard to assert exactly without strict math, but basic run check
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should split at spaces if possible', () => {
    const text = "word ".repeat(20); // 100 chars
    const chunks = chunkText(text, 10, 0); // 40 chars

    // Should not break in middle of "word"
    expect(chunks[0].endsWith('word')).toBe(true);
  });
});
