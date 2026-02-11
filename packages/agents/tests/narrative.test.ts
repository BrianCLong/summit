import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NarrativeWarfareDetector, GraphSlice } from '../src/detectors/narrative';

describe('NarrativeWarfareDetector', () => {
  let detector: NarrativeWarfareDetector;
  const mockDriver = {} as any;

  beforeEach(() => {
    detector = new NarrativeWarfareDetector(mockDriver);
  });

  it('should detect coordinated PR spam', async () => {
    const graphSlice: GraphSlice = {
      nodes: Array(11).fill({ type: 'PullRequest', id: 'pr' }),
      edges: [],
      metadata: {}
    };

    const signals = await detector.detectNarrative(graphSlice);

    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe('coordinated-pr-spam');
  });

  it('should mock LLM detection of narrative injection', async () => {
    const graphSlice: GraphSlice = {
      nodes: [{ type: 'Narrative', id: 'n1', properties: { description: 'malicious propaganda' } }],
      edges: [],
      metadata: {}
    };

    const signals = await detector.detectNarrative(graphSlice);

    // Mock is deterministic for 'malicious' keyword
    expect(signals.some(s => s.type === 'narrative-injection')).toBe(true);
  });
});
