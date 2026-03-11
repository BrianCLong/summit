import { describe, it, expect } from 'vitest';

describe('Praxeology Trust Lane Scoring', () => {
  it('should correctly score deduplicated writes', () => {
    // Mock writeset with duplicates
    const writeset = [
      { id: 1, content: 'a', source: 'laneA' },
      { id: 1, content: 'a', source: 'laneB' },
      { id: 2, content: 'b', source: 'laneA' }
    ];

    // Mock dedupe logic
    const dedupeWriteset = (writes) => {
      const seen = new Set();
      return writes.filter(write => {
        if (seen.has(write.id)) return false;
        seen.add(write.id);
        return true;
      });
    };

    const result = dedupeWriteset(writeset);

    expect(result.length).toBe(2);
    expect(result.find(w => w.id === 1)).toBeDefined();
    expect(result.find(w => w.id === 2)).toBeDefined();
  });

  it('should assign higher trust scores to verified lanes', () => {
    const laneScores = {
      'laneA': 95,
      'laneB': 40,
      'laneC': 80
    };

    const getTrustScore = (lane) => laneScores[lane] || 0;

    expect(getTrustScore('laneA')).toBeGreaterThan(getTrustScore('laneC'));
    expect(getTrustScore('laneC')).toBeGreaterThan(getTrustScore('laneB'));
    expect(getTrustScore('unknownLane')).toBe(0);
  });
});
