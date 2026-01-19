import { describe, expect, it } from '@jest/globals';
import {
  IOSponsorAttributionService,
  SponsorAttributionRequest,
} from '../IOSponsorAttributionService';

describe('IOSponsorAttributionService', () => {
  const service = new IOSponsorAttributionService();

  const baseRequest: SponsorAttributionRequest = {
    indicators: [
      {
        id: 'infra-1',
        category: 'infrastructure',
        description: 'Reuse of CDN fronting pattern',
        confidence: 0.9,
      },
      {
        id: 'timing-1',
        category: 'timing',
        description: 'Operations align to sponsor timezone',
        confidence: 0.8,
      },
      {
        id: 'lang-1',
        category: 'languageMarker',
        description: 'Dialect marker in payload notes',
        confidence: 0.6,
      },
      {
        id: 'content-1',
        category: 'contentFingerprint',
        description: 'Shared narrative templates',
        confidence: 0.7,
      },
    ],
    candidates: [
      { id: 'sponsor-a', name: 'Sponsor A' },
      { id: 'sponsor-b', name: 'Sponsor B' },
    ],
    signals: [
      {
        indicatorId: 'infra-1',
        sponsorId: 'sponsor-a',
        signalStrength: 0.9,
        rationale: 'Infrastructure overlap in ASN',
      },
      {
        indicatorId: 'content-1',
        sponsorId: 'sponsor-a',
        signalStrength: 0.6,
        rationale: 'Shared content fingerprints',
      },
      {
        indicatorId: 'timing-1',
        sponsorId: 'sponsor-b',
        signalStrength: 0.9,
        rationale: 'Shift overlap with working hours',
      },
      {
        indicatorId: 'lang-1',
        sponsorId: 'sponsor-b',
        signalStrength: 0.7,
        rationale: 'Language markers across posts',
      },
    ],
  };

  it('ranks sponsors using the baseline model', () => {
    const ranking = service.computeRanking(baseRequest);

    expect(ranking.hypotheses[0].sponsorId).toBe('sponsor-a');
    expect(ranking.hypotheses[0].confidence).toBeGreaterThan(
      ranking.hypotheses[1].confidence,
    );
    expect(ranking.coverage.indicatorCount).toBe(4);
  });

  it('shifts rankings when scenario weights emphasize language and timing', () => {
    const scenario = service.computeScenario(baseRequest, {
      infrastructure: 0.1,
      timing: 0.4,
      contentFingerprint: 0.1,
      languageMarker: 0.4,
    });

    expect(scenario.baseline.hypotheses[0].sponsorId).toBe('sponsor-a');
    expect(scenario.scenario.hypotheses[0].sponsorId).toBe('sponsor-b');
    expect(scenario.deltas).toHaveLength(2);
  });
});
