import { IntelCorroborationService } from '../../src/services/IntelCorroborationService';
import { describe, test, expect } from '@jest/globals';

describe('IntelCorroborationService', () => {
  test('computes confidence with evidence and analyst ratings', () => {
    const service = new IntelCorroborationService();
    const now = Date.now();
    const evidence = [
      { source: 'sourceA', timestamp: now, trust: 0.9, supports: true },
      { source: 'sourceB', timestamp: now, trust: 0.8, supports: true },
      { source: 'sourceC', timestamp: now, trust: 0.6, supports: false },
    ];

    service.addAnalystRating('claim1', 0.8);
    service.addAnalystRating('claim1', 0.6);

    const result = service.evaluateClaim('claim1', evidence);

    expect(result.corroboratedBy).toEqual(['sourceA', 'sourceB']);
    expect(result.disputedBy).toEqual(['sourceC']);
    expect(result.confidenceScore).toBeCloseTo(0.72, 2);
  });
});
