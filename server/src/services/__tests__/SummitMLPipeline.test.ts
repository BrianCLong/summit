
import { summitMLPipeline } from '../SummitMLPipeline.js';
import { describe, it, expect } from '@jest/globals';

describe('SummitMLPipeline', () => {
  it('should classify a military entity correctly', async () => {
    const entity = {
      name: 'Alpha Platoon',
      content: 'Troop movements near the border.'
    };
    const result = await summitMLPipeline.classifyEntity(entity);
    expect(result.type).toBe('MILITARY_UNIT');
    expect(result.tags).toContain('armed_forces');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should classify a bot entity correctly', async () => {
    const entity = {
      name: 'Bot_123',
      content: 'Automated script running repeatedly.'
    };
    const result = await summitMLPipeline.classifyEntity(entity);
    expect(result.type).toBe('AUTOMATED_ACTOR');
    expect(result.tags).toContain('botnet');
  });

  it('should calculate threat score correctly for high risk entity', async () => {
    const entity = {
      name: 'Bad Actor',
      content: 'Troops and tanks moving.', // Triggers MILITARY_UNIT
      history: [
        { severity: 'HIGH', date: '2023-01-01' },
        { severity: 'HIGH', date: '2023-02-01' }
      ]
    };

    const result = await summitMLPipeline.calculateThreatScore(entity);
    expect(result.score).toBeGreaterThan(50); // Base 50 for military + 20 for history
    expect(result.factors).toContain('History of 2 high-severity incidents');
  });

  it('should predict increasing risk trend', async () => {
    const entity = {
      name: 'Escalating Situation',
      content: 'Military buildup.',
      history: [
        { severityValue: 10, date: '2023-01-01' },
        { severityValue: 20, date: '2023-02-01' },
        { severityValue: 50, date: '2023-03-01' } // Significant increase
      ]
    };

    const result = await summitMLPipeline.predictFutureRisks(entity);
    expect(result.trend).toBe('INCREASING');
    expect(result.predictedThreatLevel).toBeGreaterThan(50);
    expect(result.nextLikelyEvent).toBe('Mobilization or deployment to new sector');
  });
});
