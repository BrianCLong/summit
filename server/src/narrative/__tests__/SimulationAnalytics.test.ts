
import { describe, it, expect } from '@jest/globals';
import { simulationAnalyticsService } from '../analytics-service.js';
import { NarrativeState } from '../types.js';

describe('Simulation Analytics (Task #113)', () => {
  it('should aggregate momentum history across ticks', () => {
    const mockState: Partial<NarrativeState> = {
      id: 'sim-1',
      tick: 1,
      startedAt: new Date('2026-01-01T00:00:00Z'),
      tickIntervalMinutes: 60,
      entities: {
        'e1': {
          id: 'e1',
          name: 'Entity 1',
          themes: { 'Security': 0.8 },
          history: [
            { tick: 0, sentiment: 0.5, influence: 100 },
            { tick: 1, sentiment: 0.2, influence: 120 }
          ]
        } as any
      },
      parameters: {
        'stability': {
          name: 'stability',
          history: [
            { tick: 0, value: 0.9 },
            { tick: 1, value: 0.7 }
          ]
        } as any
      }
    };

    const history = simulationAnalyticsService.getMomentumHistory(mockState as NarrativeState);

    expect(history).toHaveLength(2);
    expect(history[0].tick).toBe(0);
    expect(history[1].tick).toBe(1);

    // Check momentum calculation (weight * influence)
    expect(history[0].themeMomenta['Security']).toBe(80);
    expect(history[1].themeMomenta['Security']).toBe(96);

    // Check sentiment averaging
    expect(history[0].avgSentiment).toBe(0.5);
    expect(history[1].avgSentiment).toBe(0.2);

    // Check parameters
    expect(history[0].parameters['stability']).toBe(0.9);
    expect(history[1].parameters['stability']).toBe(0.7);
  });
});
