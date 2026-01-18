import { describe, expect, it } from 'vitest';
import { evidenceScore } from '../evidence.js';
import { defaultAggregator } from '../aggregator.js';
import type { LaneResult } from '../types.js';

const baseResult = (laneId: string, answer: string): LaneResult => ({
  laneId,
  finalAnswer: answer,
  structuredClaims: { answer },
  evidenceArtifacts: [],
  confidence: 0.2,
});

describe('evidenceScore', () => {
  it('weights execution and policy artifacts higher than notes', () => {
    const score = evidenceScore([
      { id: 'note', kind: 'note', description: 'note' },
      { id: 'exec', kind: 'execution-log', description: 'exec' },
      { id: 'policy', kind: 'policy-evaluation', description: 'policy' },
    ]);

    expect(score).toBeGreaterThan(6);
  });
});

describe('defaultAggregator', () => {
  it('flags disagreement when claims diverge', () => {
    const results = [
      baseResult('narrative', 'Answer A'),
      baseResult('program', 'Answer B'),
    ];

    const decision = defaultAggregator.aggregate(results);
    expect(decision.disagreement).toBe(true);
  });

  it('selects the highest evidence lane', () => {
    const resultA: LaneResult = {
      ...baseResult('narrative', 'Answer A'),
      evidenceArtifacts: [{ id: 'trace', kind: 'trace', description: 'trace' }],
      confidence: 0.3,
    };

    const resultB: LaneResult = {
      ...baseResult('program', 'Answer B'),
      evidenceArtifacts: [{ id: 'test', kind: 'test-result', description: 'test' }],
      confidence: 0.3,
    };

    const decision = defaultAggregator.aggregate([resultA, resultB]);
    expect(decision.selectedLaneId).toBe('program');
  });
});
