import { RetrievalEngine } from '../src/engine.js';
import { canonicalize } from '../src/util/canonical.js';
import { describe, it, expect } from '@jest/globals';

// Stubbing emitEvidence if needed, but integration test is fine too.
// For now we rely on the real implementation which writes to disk (safe in sandbox).

describe('RetrievalEngine Determinism', () => {
  const engine = new RetrievalEngine();

  it('should produce identical plans for identical inputs', async () => {
    const intent = "verify determinism";
    const plan1 = await engine.compile(intent, { topK: 5 });
    const plan2 = await engine.compile(intent, { topK: 5 });

    expect(canonicalize(plan1)).toBe(canonicalize(plan2));
  });

  it('should produce identical results/evidence refs for identical plans', async () => {
    const intent = "verify determinism run";
    const plan = await engine.compile(intent);

    const result1 = await engine.executeLocalStub(plan);
    const result2 = await engine.executeLocalStub(plan);

    expect(result1.evidenceBundleRef).toBe(result2.evidenceBundleRef);
    expect(canonicalize(result1)).toBe(canonicalize(result2));
  });
});
