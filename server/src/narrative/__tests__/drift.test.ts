import { describe, it, expect, beforeEach } from '@jest/globals';
import { NarrativeDriftDetector } from '../drift.js';
import type { NarrativeState, EntityDynamicState } from '../types.js';

describe('NarrativeDriftDetector', () => {
  let detector: NarrativeDriftDetector;
  const mockEntity: EntityDynamicState = {
    id: 'e1',
    name: 'Entity 1',
    type: 'actor',
    alignment: 'ally',
    influence: 0.5,
    sentiment: 0.0,
    volatility: 0.1,
    resilience: 0.5,
    themes: {},
    relationships: [],
    pressure: 0,
    trend: 'stable',
    lastUpdatedTick: 10,
    history: []
  };

  const mockState: NarrativeState = {
    id: 's1',
    name: 'Sim 1',
    tick: 10,
    startedAt: new Date(),
    timestamp: new Date(),
    tickIntervalMinutes: 60,
    themes: ['t1'],
    entities: { 'e1': mockEntity },
    parameters: {},
    arcs: [],
    recentEvents: [],
    narrative: {
        mode: 'rule-based',
        summary: '',
        highlights: [],
        risks: [],
        opportunities: []
    }
  };

  beforeEach(() => {
    detector = new NarrativeDriftDetector({ windowSize: 5, sensitivity: 2, minDataPoints: 3 });
    mockEntity.history = [];
  });

  it('should detect high drift when sentiment jumps significantly', () => {
    // History: 0, 0, 0, 0, 0 (Mean=0, StdDev=0)
    // Current: 0.5
    mockEntity.history = [
        { tick: 1, sentiment: 0, influence: 0.5 },
        { tick: 2, sentiment: 0, influence: 0.5 },
        { tick: 3, sentiment: 0, influence: 0.5 },
        { tick: 4, sentiment: 0, influence: 0.5 },
        { tick: 5, sentiment: 0, influence: 0.5 },
        { tick: 6, sentiment: 0.5, influence: 0.5 }, // Drift
    ];

    const events = detector.detect(mockState);
    expect(events).toHaveLength(1);
    expect(events[0].metric).toBe('sentiment');
    expect(events[0].severity).toBe('high');
    expect(events[0].deviationScore).toBe(999);
  });

  it('should not detect drift for stable values', () => {
    mockEntity.history = [
        { tick: 1, sentiment: 0.1, influence: 0.5 },
        { tick: 2, sentiment: 0.1, influence: 0.5 },
        { tick: 3, sentiment: 0.1, influence: 0.5 },
        { tick: 4, sentiment: 0.1, influence: 0.5 },
        { tick: 5, sentiment: 0.1, influence: 0.5 },
    ];

    const events = detector.detect(mockState);
    expect(events).toHaveLength(0);
  });

  it('should detect drift based on standard deviation', () => {
    // Mean ~0.5, but noisy.
    // 0.4, 0.6, 0.4, 0.6, 0.4, 0.6
    // Mean = 0.5, Variance = 0.01, StdDev = 0.1
    // Next value: 0.9. (0.9 - 0.5) / 0.1 = 4.0 Z-score > 2

    mockEntity.history = [
        { tick: 1, sentiment: 0.4, influence: 0.5 },
        { tick: 2, sentiment: 0.6, influence: 0.5 },
        { tick: 3, sentiment: 0.4, influence: 0.5 },
        { tick: 4, sentiment: 0.6, influence: 0.5 },
        { tick: 5, sentiment: 0.4, influence: 0.5 },
        { tick: 6, sentiment: 0.6, influence: 0.5 },
        { tick: 7, sentiment: 0.9, influence: 0.5 }, // Drift
    ];

    const events = detector.detect(mockState);
    expect(events.length).toBeGreaterThan(0);
    const event = events.find(e => e.metric === 'sentiment');
    expect(event).toBeDefined();
    if (event) {
        expect(event.deviationScore).toBeGreaterThan(2.0);
    }
  });
});
