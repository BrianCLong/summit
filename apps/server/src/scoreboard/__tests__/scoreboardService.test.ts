import { describe, it, expect, beforeEach } from '@jest/globals';
import { scoreboardService } from '../scoreboardService.js';
import { DomainMetricsInput } from '../types.js';

const baseMetrics: DomainMetricsInput = {
  domainId: 'intelgraph',
  domainName: 'IntelGraph Core',
  periodStart: '2025-01-01',
  periodEnd: '2025-01-07',
  sloBurnRate: 0.1,
  errorBudgetRemaining: 0.5,
  cycleTimeDays: 4,
  wipCount: 3,
  wipLimit: 5,
  blockedTimeHours: 5,
  reworkRate: 0.1,
  costPerUnit: 120,
  onCall: { pagesPerShift: 2, sleepDebtHours: 2, toilHours: 4 },
  deletionShipped: 1,
  debtBurn: 3,
  repeatIncidents: 0,
  prSizeLimitBreaches: 0,
  releaseEnvelopeRequired: true,
};

describe('ScoreboardService', () => {
  beforeEach(() => {
    scoreboardService.reset();
    scoreboardService.upsertDomainMetrics({ ...baseMetrics });
  });

  it('gates roadmap when error budget is depleted without exception', () => {
    const depleted = scoreboardService.upsertDomainMetrics({
      ...baseMetrics,
      errorBudgetRemaining: 0.01,
      repeatIncidents: 3,
    });

    const roadmapGate = depleted.gates.find((gate) => gate.gate === 'ROADMAP_SCOPE');
    expect(roadmapGate?.state).toBe('BLOCKED');
    expect(roadmapGate?.reason).toContain('Error budget');
  });

  it('honors exceptions for roadmap gating', () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    scoreboardService.registerException({
      domainId: baseMetrics.domainId,
      gate: 'ROADMAP_SCOPE',
      owner: 'SRE Lead',
      reason: 'Approved burn for reliability release',
      expiresAt,
    });

    const withException = scoreboardService.upsertDomainMetrics({
      ...baseMetrics,
      errorBudgetRemaining: 0.0,
    });

    const roadmapGate = withException.gates.find((gate) => gate.gate === 'ROADMAP_SCOPE');
    expect(roadmapGate?.state).toBe('OVERRIDDEN');
    expect(roadmapGate?.ownerOverride).toBe('SRE Lead');
    expect(roadmapGate?.expiresAt).toBe(expiresAt);
  });

  it('requires release envelopes for Tier 0/1 domains', () => {
    const withoutEnvelope = scoreboardService.upsertDomainMetrics({ ...baseMetrics });
    const releaseGate = withoutEnvelope.gates.find((gate) => gate.gate === 'RELEASE_ENVELOPE');
    expect(releaseGate?.state).toBe('BLOCKED');

    scoreboardService.registerReleaseEnvelope({
      domainId: baseMetrics.domainId,
      owner: 'Release Captain',
      metrics: ['latency', 'error_rate'],
      rollbackPlan: 'Auto-rollback enabled',
    });

    const withEnvelope = scoreboardService.getDomainScoreboard(baseMetrics.domainId)!;
    const reopenedGate = withEnvelope.gates.find((gate) => gate.gate === 'RELEASE_ENVELOPE');
    expect(reopenedGate?.state).toBe('OPEN');
  });

  it('tracks decision hygiene with revisit dates', () => {
    const entry = scoreboardService.logDecision({
      domainId: baseMetrics.domainId,
      title: 'Adopt WIP limit of 5',
      owner: 'Eng Manager',
      rationale: 'Flow discipline enforcement',
      revisitDate: '2025-02-01',
      decisionType: 'TWO_WAY_DOOR',
    });

    const scoreboards = scoreboardService.listScoreboards();
    const domain = scoreboards.find((d) => d.domainId === baseMetrics.domainId);
    expect(domain?.decisions.some((d) => d.id === entry.id)).toBe(true);
  });
});
