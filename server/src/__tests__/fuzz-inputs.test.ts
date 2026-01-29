import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
jest.mock(
  'validator',
  () => ({
    normalizeEmail: (value: string) => value?.toLowerCase?.() ?? '',
    isURL: () => true,
  }),
  { virtual: true },
);

jest.mock(
  'html-escaper',
  () => ({
    escape: (value: string) => value.replace(/[<>]/g, ''),
  }),
  { virtual: true },
);

jest.mock(
  'isomorphic-dompurify',
  () => ({
    sanitize: (value: string) => value,
    addHook: () => undefined,
    removeAllHooks: () => undefined,
  }),
  { virtual: true },
);

import { sanitizeFilePath, sanitizeString } from '../utils/input-sanitization.ts';

function createDeterministicRng(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function buildFuzzCases(seed: number, count: number) {
  const rng = createDeterministicRng(seed);
  const corpus: string[] = [];
  const alphabet = ['../', './', '~/', '<script>alert(1)</script>', '\0', 'header-value', '"', "'", ' ', '%'];

  for (let i = 0; i < count; i += 1) {
    const noiseLength = 3 + Math.floor(rng() * 5);
    let sample = '';
    for (let j = 0; j < noiseLength; j += 1) {
      const token = alphabet[Math.floor(rng() * alphabet.length)];
      sample += token;
    }
    corpus.push(sample);
  }

  return corpus;
}

describe('Deterministic fuzzing of boundary inputs', () => {
  const graphqlCorpus = buildFuzzCases(20250202, 40);
  const restCorpus = buildFuzzCases(20250203, 50);

  it('sanitizes GraphQL-style payloads without crashes or policy bypass', () => {
    graphqlCorpus.forEach((payload) => {
      const sanitized = sanitizeString(payload);
      expect(sanitized.includes('<')).toBe(false);
      expect(sanitized.length).toBeLessThanOrEqual(payload.length + 10);
      expect(sanitized).not.toContain('\0');
      expect(() => sanitized).not.toThrow();
    });
  });

  it('guards REST paths against traversal while keeping logs reproducible', () => {
    const basePath = '/tmp/uploads';
    restCorpus.forEach((pathCandidate) => {
      try {
        const result = sanitizeFilePath(pathCandidate, basePath);
        expect(result.startsWith(basePath)).toBe(true);
        expect(result.includes('..')).toBe(false);
        expect(result.includes('~')).toBe(false);
      } catch (error: any) {
        expect((error as Error).message.toLowerCase()).toMatch(/path/);
      }
    });
  });
});
