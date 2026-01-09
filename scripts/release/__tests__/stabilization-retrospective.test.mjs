import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRetrospective } from '../../releases/generate_stabilization_retrospective.mjs';
import { deriveCandidates } from '../../releases/derive_stabilization_roadmap_candidates.mjs';

const baseWeek = (weekEnding, overrides = {}) => ({
  dirName: weekEnding,
  baseDir: `/tmp/${weekEnding}`,
  scorecard: {
    week_ending: weekEnding,
    risk_index: 35,
    done_p0: 3,
    done_p1: 5,
    on_time_rate: 0.8,
    overdue_load: 2,
    overdue_load_p0: 1,
    evidence_compliance: 0.92,
    issuance_completeness: 0.94,
    ...overrides.scorecard,
  },
  escalation: {
    blocked_unissued: 1,
    overdue_items: [
      { id: 'P0-123', area: 'auth', owner: 'core' },
      { id: 'P1-456', area: 'api', owner: 'platform' },
    ],
    ...overrides.escalation,
  },
  diff: { notes: 'ok', ...overrides.diff },
});

test('buildRetrospective aggregates recurring offenders and metrics', () => {
  const weeklySnapshots = [
    baseWeek('2026-01-03'),
    baseWeek('2026-01-10', {
      scorecard: { risk_index: 28, evidence_compliance: 0.96 },
    }),
  ];
  const retrospective = buildRetrospective({
    weeklySnapshots,
    missingArtifacts: [],
    weeksRequested: 2,
  });

  assert.equal(retrospective.window.weeks_included, 2);
  assert.equal(retrospective.metrics.series.length, 2);
  assert.ok(
    retrospective.recurring_offenders.items.some((item) => item.id === 'P0-123'),
  );
});

test('deriveCandidates honors thresholds and caps', () => {
  const retrospective = buildRetrospective({
    weeklySnapshots: [
      baseWeek('2026-01-03'),
      baseWeek('2026-01-10'),
      baseWeek('2026-01-17'),
    ],
    missingArtifacts: [],
    weeksRequested: 3,
  });

  const policy = {
    max_candidates: 5,
    thresholds: {
      recurring_overdue_weeks: 2,
      min_risk_index_avg: 30,
      evidence_compliance_min: 0.95,
    },
  };

  const candidates = deriveCandidates({ retrospective, policy });
  const slugs = candidates.map((candidate) => candidate.slug);

  assert.ok(slugs.includes('issuance-hygiene'));
  assert.ok(slugs.includes('evidence-compliance'));
  assert.ok(slugs.includes('p0-sla-adherence'));
  assert.ok(slugs.includes('systemic-risk-reduction'));
});
