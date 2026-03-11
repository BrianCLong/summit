import * as assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_DEFENSIVE_PRIMITIVES,
  simulateResilienceDelta,
  type CampaignPressureSnapshot,
} from '../strategy/resilienceDeltaSimulator';

function makeSnapshot(overrides: Partial<CampaignPressureSnapshot> = {}): CampaignPressureSnapshot {
  return {
    campaignId: 'cw-ops-17',
    asOf: '2026-03-11T00:00:00Z',
    narrativeCount: 8,
    evidenceCount: 6,
    indicatorKinds: ['bot-burst', 'timed-repost', 'cross-platform-seed'],
    scores: {
      adaptivity: 0.82,
      cognitiveInfrastructure: 0.76,
      crossDomainLinkage: 0.71,
      swarmCoordination: 0.68,
    },
    ...overrides,
  };
}

test('simulator is deterministic regardless of primitive input order', () => {
  const snapshot = makeSnapshot();
  const reversed = [...DEFAULT_DEFENSIVE_PRIMITIVES].reverse();

  const first = simulateResilienceDelta(snapshot, DEFAULT_DEFENSIVE_PRIMITIVES);
  const second = simulateResilienceDelta(snapshot, reversed);

  assert.deepEqual(first, second);
  assert.ok(first.recommended);
  assert.match(first.recommended.planId, /^cogwar-plan-[A-F0-9]{12}$/);
});

test('simulator enforces governance constraints', () => {
  const snapshot = makeSnapshot({ evidenceCount: 2 });
  const constrained = simulateResilienceDelta(snapshot, DEFAULT_DEFENSIVE_PRIMITIVES, {
    maxBudget: 0.2,
    maxLatencyHours: 10,
    minimumConfidence: 0.8,
  });

  assert.equal(constrained.candidates.length, 0);
  assert.equal(constrained.recommended, null);
});

test('higher campaign pressure creates larger projected resilience delta', () => {
  const highPressure = makeSnapshot();
  const lowPressure = makeSnapshot({
    scores: {
      adaptivity: 0.4,
      cognitiveInfrastructure: 0.35,
      crossDomainLinkage: 0.29,
      swarmCoordination: 0.33,
    },
  });

  const high = simulateResilienceDelta(highPressure, DEFAULT_DEFENSIVE_PRIMITIVES);
  const low = simulateResilienceDelta(lowPressure, DEFAULT_DEFENSIVE_PRIMITIVES);

  assert.ok(high.recommended);
  assert.ok(low.recommended);
  assert.ok((high.recommended?.resilienceDelta ?? 0) > (low.recommended?.resilienceDelta ?? 0));
});

