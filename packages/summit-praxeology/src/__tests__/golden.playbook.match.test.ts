import { describe, expect, it } from 'vitest';
import evidence from '../fixtures/evidence.sample.json';
import playbook from '../fixtures/playbook.defensive.example.json';
import type { PGActionSignature, PGPlaybook } from '../engine/types';
import { matchPlaybook } from '../engine/matchPlaybook';

describe('PG matcher (non-prescriptive output)', () => {
  it('emits an analytic hypothesis with confidence + gaps, without recommendations', () => {
    const actionSignaturesById: Record<string, PGActionSignature> = {
      'pg.action.sig.coordinated-posting.v1': {
        id: 'pg.action.sig.coordinated-posting.v1',
        label: 'Coordinated posting signature',
        indicators: [
          {
            id: 'ind1',
            signal: 'coordinated posting pattern',
            weight: 0.7
          }
        ]
      },
      'pg.action.sig.cross-platform-amplification.v1': {
        id: 'pg.action.sig.cross-platform-amplification.v1',
        label: 'Cross-platform amplification signature',
        indicators: [
          {
            id: 'ind2',
            signal: 'cross-platform amplification',
            weight: 0.3
          }
        ]
      }
    };

    const output = matchPlaybook({
      playbook: playbook as PGPlaybook,
      actionSignaturesById,
      evidence
    });

    expect(output.playbookId).toBe(playbook.id);
    expect(output.confidence).toBeGreaterThan(0);
    expect(output.matchedIndicators.length).toBeGreaterThan(0);
    expect('recommendedActions' in output).toBe(false);
    expect(output.notes.toLowerCase()).toContain('non-prescriptive');
  });
});
