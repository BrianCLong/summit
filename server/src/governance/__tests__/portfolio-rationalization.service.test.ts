import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { PortfolioRationalizationRepository } from '../rationalization/PortfolioRationalizationRepository.js';
import { PortfolioRationalizationService } from '../rationalization/PortfolioRationalizationService.js';
import { FeatureUsageGraph } from '../rationalization/types.js';

describe('PortfolioRationalizationService', () => {
  const buildService = async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-rationalization-'));
    const repo = new PortfolioRationalizationRepository(path.join(dir, 'state.json'));
    return new PortfolioRationalizationService(repo);
  };

  const baseModule = {
    id: 'module-a',
    name: 'Signals',
    owner: 'alice',
    outcomes: ['alerts', 'intel'],
    features: ['search', 'timeline'],
    usage: 100,
    revenue: 100000,
    incidentRate: 2,
  };

  it('enforces retire freeze and requires exec + GM approval for net-new', async () => {
    const service = await buildService();
    await service.upsertModule(baseModule);
    await service.classifyModule('module-a', 'RETIRE', 'duplicate surface');

    expect(() =>
      service.assertFeatureDeliveryAllowed('module-a', {
        requester: 'alice',
        description: 'new feature',
      }),
    ).toThrow('Feature delivery frozen');

    expect(() =>
      service.assertFeatureDeliveryAllowed('module-a', {
        requester: 'alice',
        description: 'exception',
        execApproved: true,
        gmApproved: true,
      }),
    ).not.toThrow();
  });

  it('requires telemetry, compat completion, and migration adapters before removal', async () => {
    const service = await buildService();
    await service.upsertModule({ ...baseModule, id: 'module-b', name: 'Legacy UI' });
    await service.classifyModule('module-b', 'RETIRE', 'UI consolidation');
    await service.planDeprecation(
      'module-b',
      [
        { segment: 'enterprise', impactTier: 'HIGH', notes: 'concierge migration' },
        { segment: 'mid-market', impactTier: 'MEDIUM' },
      ],
      {
        startsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        cohorts: ['gold', 'platinum'],
        toggleableByCohort: true,
      },
      ['exec+gm approval required during freeze'],
    );
    await service.registerMigrationAdapter(
      'module-b',
      {
        name: 'legacy-router',
        description: 'routes callers to canonical path',
        sourceContract: 'legacy-ui',
        targetContract: 'canonical-ui',
      },
      (payload) => ({ ...payload, routed: true }),
    );
    await service.recordTelemetry('module-b', {
      timestamp: new Date().toISOString(),
      activeUsers: 42,
      requests: 120,
      errors: 1,
    });

    const removal = await service.requestRemoval('module-b');
    expect(removal.moduleId).toBe('module-b');
    expect(removal.reliabilityGainPct).toBeGreaterThanOrEqual(0);
    const routed = service.executeMigrationAdapter('module-b', 'legacy-router', { id: '123' });
    expect(routed.routed).toBe(true);
  });

  it('suggests duplicate outcomes using feature-level usage graphs', async () => {
    const service = await buildService();
    await service.upsertModule(baseModule);
    await service.upsertModule({
      ...baseModule,
      id: 'module-c',
      name: 'Signals Twin',
      owner: 'bob',
      outcomes: ['alerts', 'intel', 'reports'],
      features: ['search', 'export'],
      usage: 80,
    });

    const usageGraph: FeatureUsageGraph = {
      search: [
        { outcome: 'alerts', count: 70 },
        { outcome: 'intel', count: 20 },
      ],
      timeline: [{ outcome: 'intel', count: 50 }],
      export: [{ outcome: 'reports', count: 40 }],
    };

    const suggestions = service.suggestDuplicateOutcomesFromUsageGraph(usageGraph, 0.4);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].modules).toContain('module-a');
    expect(suggestions[0].modules).toContain('module-c');
  });

  it('supports self-service compat-mode toggles per cohort with expiry', async () => {
    const service = await buildService();
    await service.toggleCompatModeForCohort(
      'cohort-a',
      true,
      'compat window for migration',
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    );
    expect(service.isCompatModeEnabled('cohort-a')).toBe(true);

    await service.toggleCompatModeForCohort(
      'cohort-a',
      false,
      'window closed',
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    );
    expect(service.isCompatModeEnabled('cohort-a')).toBe(false);
  });
});
