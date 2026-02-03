import { describe, it, expect } from 'vitest';
import { generateEvidenceId, createDeterministicArtifact } from '../src/artifacts';

describe('Determinism', () => {
  it('should generate the same Evidence ID for the same content', () => {
    const content = { b: 2, a: 1 };
    const content2 = { a: 1, b: 2 };
    const date = '2026-01-27';

    const id1 = generateEvidenceId('EXTORTION', date, content);
    const id2 = generateEvidenceId('EXTORTION', date, content2);

    expect(id1).toBe(id2);
    expect(id1).toMatch(/^EVD-EXTORTION-20260127-[a-f0-9]{8}$/);
  });

  it('should produce stable JSON with sorted keys', () => {
    const content = { z: 1, a: 2, m: { c: 3, b: 4 } };
    const artifact = createDeterministicArtifact(content);

    const keys = Object.keys(artifact);
    expect(keys).toEqual(['a', 'm', 'z']);
    expect(Object.keys(artifact.m)).toEqual(['b', 'c']);
  });
});
