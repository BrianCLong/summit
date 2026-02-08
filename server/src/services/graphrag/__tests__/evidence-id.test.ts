import {
  canonicalizeEvidenceText,
  createEvidenceId,
  hashEvidenceSpan,
} from '../evidence-id.js';

describe('evidence-id', () => {
  it('canonicalizes evidence text deterministically', () => {
    const canonical = canonicalizeEvidenceText('  Alpha\nBeta\tGamma  ');
    expect(canonical).toBe('Alpha Beta Gamma');
  });

  it('hashes spans deterministically with validation', () => {
    expect(hashEvidenceSpan({ start: 3, end: 9 })).toHaveLength(8);
    expect(() => hashEvidenceSpan({ start: 4, end: 2 })).toThrow(
      'Evidence span end must be greater than or equal to start.',
    );
  });

  it('creates a stable EvidenceId with canonicalized content', () => {
    const base = {
      source: 'ingest',
      dataset: 'fixtures',
      content: 'Alpha  Beta',
      span: { start: 12, end: 18 },
    };

    const idA = createEvidenceId(base);
    const idB = createEvidenceId({
      ...base,
      content: '  Alpha\nBeta ',
    });

    expect(idA).toMatch(/^EVD::ingest::fixtures::[a-f0-9]{8}::[a-f0-9]{8}$/);
    expect(idA).toBe(idB);
  });
});
